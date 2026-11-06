import AsyncStorage from '@react-native-async-storage/async-storage'

export type NearbyType = 'food' | 'stay'

export interface NearbyPlace {
  id: string
  name: string
  kinds: string[]
  // 0-3: quanto è curata la scheda del luogo (sito, orari, stelle…)
  rate: number
  // Cucina (es. "italian") e stelle degli hotel, se indicate
  cuisine?: string | null
  stars?: number | null
  lat: number
  lng: number
  // Metri dalla tappa
  distance: number
}

// Etichette per i tipi di luogo (tag OpenStreetMap)
const KIND_LABELS: Record<string, string> = {
  restaurant: 'Ristorante',
  cafe: 'Caffè',
  bar: 'Bar',
  pub: 'Pub',
  fast_food: 'Fast food',
  hotel: 'Hotel',
  hostel: 'Ostello',
  guest_house: 'Guest house',
  apartment: 'Appartamento',
  motel: 'Motel',
  chalet: 'Chalet',
}

export const placeKindLabel = (place: NearbyPlace, type: NearbyType) =>
  KIND_LABELS[place.kinds[0]] ?? (type === 'food' ? 'Locale' : 'Alloggio')

export const formatDistance = (meters: number) => (meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`)

// Overpass API (OpenStreetMap): gratuita e senza chiave. La richiesta parte dal telefono, perché dai server cloud
// (es. Supabase) i server pubblici di Overpass spesso non rispondono. I risultati restano in cache sul telefono.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const SETTINGS = {
  food: { tag: 'amenity', values: 'restaurant|cafe|bar|pub|fast_food', radius: 800 },
  stay: { tag: 'tourism', values: 'hotel|hostel|guest_house|apartment|motel|chalet', radius: 1500 },
} as const

const CACHE_PREFIX = 'nearby:v1:'
const CACHE_TTL = 14 * 24 * 60 * 60 * 1000
const MAX_RESULTS = 20
const REQUEST_TIMEOUT = 15000

const memory = new Map<string, NearbyPlace[]>()

const distanceM = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const rad = Math.PI / 180
  const h =
    Math.sin(((bLat - aLat) * rad) / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(((bLng - aLng) * rad) / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(h))
}

const queryOverpass = async (query: string): Promise<any[]> => {
  let lastError = ''
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      if (response.ok) return (await response.json()).elements ?? []
      lastError = `${new URL(endpoint).host}: ${response.status}`
    } catch (e: any) {
      lastError = `${new URL(endpoint).host}: ${e?.name === 'AbortError' ? 'timeout' : e?.message ?? 'errore'}`
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(lastError)
}

export const fetchNearbyPlaces = async (lat: number, lng: number, type: NearbyType): Promise<NearbyPlace[]> => {
  // Cache: stessa zona (circa 100 m) e stesso tipo
  const key = `${type}:${lat.toFixed(3)}:${lng.toFixed(3)}`
  const inMemory = memory.get(key)
  if (inMemory) return inMemory

  let stale: NearbyPlace[] | null = null
  try {
    const stored = await AsyncStorage.getItem(CACHE_PREFIX + key)
    if (stored) {
      const parsed = JSON.parse(stored) as { at: number; places: NearbyPlace[] }
      stale = parsed.places
      if (Date.now() - parsed.at < CACHE_TTL) {
        memory.set(key, parsed.places)
        return parsed.places
      }
    }
  } catch {}

  const { tag, values, radius } = SETTINGS[type]
  const around = `(around:${radius},${lat},${lng})`
  const query = `[out:json][timeout:20];(node["${tag}"~"^(${values})$"]["name"]${around};way["${tag}"~"^(${values})$"]["name"]${around};);out center tags 150;`

  let elements: any[]
  try {
    elements = await queryOverpass(query)
  } catch (e: any) {
    // Senza rete o con i server occupati è meglio una copia vecchia che niente
    if (stale) return stale
    throw new Error(`Non riesco a caricare i luoghi vicini (${e?.message ?? 'servizio non raggiungibile'}).`)
  }

  const seen = new Set<string>()
  const places: NearbyPlace[] = []
  for (const element of elements) {
    const tags = element.tags ?? {}
    const pLat = element.lat ?? element.center?.lat
    const pLng = element.lon ?? element.center?.lon
    if (!tags.name || pLat === undefined || pLng === undefined) continue
    const name = String(tags.name).trim().slice(0, 80)
    if (seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())

    const stars = Number.parseInt(String(tags.stars ?? ''), 10) || 0
    // Indicatore di "quanto è curato/noto": più informazioni nella scheda OSM, più è probabile che sia un posto affermato
    const score = (tags.website || tags['contact:website'] ? 1 : 0) + (tags.wikidata ? 2 : 0) + (tags.opening_hours ? 1 : 0) + (stars >= 4 ? 2 : stars > 0 ? 1 : 0)
    places.push({
      id: `${element.type}${element.id}`,
      name,
      kinds: [String(tags[tag])],
      cuisine: tags.cuisine ? String(tags.cuisine).split(';')[0].replace(/_/g, ' ').slice(0, 30) : null,
      stars: stars || null,
      rate: Math.min(3, score),
      lat: pLat,
      lng: pLng,
      distance: Math.round(distanceM(lat, lng, pLat, pLng)),
    })
  }

  // Prima i più curati, poi i più vicini
  const result = places.sort((a, b) => b.rate - a.rate || a.distance - b.distance).slice(0, MAX_RESULTS)
  memory.set(key, result)
  AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), places: result })).catch(() => {})
  return result
}
