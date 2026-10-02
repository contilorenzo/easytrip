import { Location } from '../components/TripDetails/TripSteps/types'

// Cerca un indirizzo o un luogo con Nominatim (max 1 richiesta al secondo)
export const geocodeQuery = async (query: string, name: string, countryCode?: string): Promise<Location | null> => {
  try {
    const codes = countryCode && countryCode.length === 2 ? `&countrycodes=${countryCode.toLowerCase()}` : ''
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1${codes}`,
      { headers: { 'User-Agent': 'EasyTrip/1.0', Accept: 'application/json' } }
    )
    const first = JSON.parse(await response.text())?.[0]
    if (!first) return null
    return {
      name,
      address: first.display_name,
      coordinates: { lat: parseFloat(first.lat), lng: parseFloat(first.lon) },
    }
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Pulisce l'indirizzo di un evento di calendario: a capo, numeri di telefono e link non servono a Nominatim
const cleanAddress = (text: string) =>
  text
    .split(/[\r\n,]+/)
    .map((part) => part.trim())
    .filter((part) => part && !/^https?:\/\//i.test(part) && !/^\+?[\d\s().-]{7,}$/.test(part))
    .join(', ')

// L'indirizzo di una prenotazione spesso contiene il nome della struttura, il CAP o altro che Nominatim non capisce:
// provo varianti sempre più semplici, ognuna aggiungendo la città del viaggio, e prendo la prima che dà un risultato.
export const geocodeStayAddress = async (
  address: string,
  title: string,
  city: string,
  country: string,
  countryCode?: string
): Promise<Location | null> => {
  const full = cleanAddress(address)
  const parts = full.split(', ').filter(Boolean)
  const place = `${city}, ${country}`

  const noPostcode = (text: string) => text.replace(/\b\d{4,5}\b/g, '').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim()

  // Prima l'indirizzo intero, poi lo tolgo un pezzo alla volta dall'inizio (via → quartiere → città):
  // se una via non è su OpenStreetMap si trova almeno il quartiere, abbastanza per mettere la tappa sulla mappa
  const progressive = parts.map((_, i) => noPostcode(parts.slice(i).join(', '))).slice(0, Math.max(parts.length - 1, 1))

  const variants = [
    full,
    `${full}, ${place}`,
    ...progressive.slice(1).map((v) => `${v}, ${place}`),
    `${title}, ${place}`,
  ]
    .map((v) => v.trim())
    .filter((v, i, all) => v && all.indexOf(v) === i)
    .slice(0, 7)

  const name = title || parts[0] || address
  for (let i = 0; i < variants.length; i++) {
    const found = await geocodeQuery(variants[i], name, countryCode)
    // L'indirizzo mostrato è quello dell'evento (quello vero della prenotazione); le coordinate possono essere approssimate
    if (found) return { ...found, address: full || found.address }
    if (i < variants.length - 1) await sleep(1100)
  }
  return null
}

// Geocodifica inversa con aggancio ai luoghi di interesse: se vicino al punto toccato c'è un luogo con un nome
// (negozio, monumento, ristorante…) restituisco quello, con le sue coordinate e il suo nome; altrimenti l'indirizzo.
// Serve dove la mappa non dice quale luogo si è toccato (Apple Maps su iOS).
export interface ReverseResult {
  name: string
  address: string
  coordinates: { lat: number; lng: number }
  isPoi: boolean
}

const reverseRequest = async (query: string) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&${query}`, {
      headers: { 'User-Agent': 'EasyTrip/1.0', Accept: 'application/json' },
    })
    const data = JSON.parse(await response.text())
    return data && !data.error ? data : null
  } catch {
    return null
  }
}

// Solo l'indirizzo del punto, senza cercare luoghi vicini
export const reverseAddress = async (lat: number, lng: number): Promise<string> => {
  const data = await reverseRequest(`lat=${lat}&lon=${lng}`)
  return data ? data.display_name : `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

// maxSnapMeters: distanza massima tra il tocco e il luogo per agganciarsi ad esso
export const reverseGeocodeWithPoi = async (lat: number, lng: number, maxSnapMeters: number): Promise<ReverseResult> => {
  const poi = await reverseRequest(`lat=${lat}&lon=${lng}&zoom=18&layer=poi`)
  if (poi?.lat && poi?.lon) {
    const poiPoint = { lat: parseFloat(poi.lat), lng: parseFloat(poi.lon) }
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(poiPoint.lat - lat)
    const dLng = toRad(poiPoint.lng - lng)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(poiPoint.lat)) * Math.sin(dLng / 2) ** 2
    const meters = 6371000 * 2 * Math.asin(Math.sqrt(h))
    if (meters <= maxSnapMeters && (poi.name || poi.display_name)) {
      return {
        name: poi.name || String(poi.display_name).split(',')[0],
        address: poi.display_name,
        coordinates: poiPoint,
        isPoi: true,
      }
    }
  }

  const address = await reverseRequest(`lat=${lat}&lon=${lng}`)
  return {
    name: address ? address.name || String(address.display_name).split(',')[0] : 'Posizione selezionata',
    address: address ? address.display_name : `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    coordinates: { lat, lng },
    isPoi: false,
  }
}
