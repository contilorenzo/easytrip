import AsyncStorage from '@react-native-async-storage/async-storage'

export interface RouteCoordinate {
  latitude: number
  longitude: number
}

const memoryCache = new Map<string, RouteCoordinate[]>()
// La versione nel prefisso invalida i percorsi salvati con una semplificazione più forte (v2 = tolleranza di 5 metri)
const STORAGE_PREFIX = 'route:v2:'

const round = (value: number) => Math.round(value * 1e5) / 1e5

// Chiave di un tratto: mezzo (a piedi o auto) più le coordinate di partenza e arrivo
export const routeKey = (profile: string, from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
  `${profile}:${round(from.lat)},${round(from.lng)};${round(to.lat)},${round(to.lng)}`

// I percorsi stradali non cambiano: li tengo in memoria e sul telefono, così alla riapertura compaiono subito
export const getCachedRoute = async (key: string): Promise<RouteCoordinate[] | null> => {
  const inMemory = memoryCache.get(key)
  if (inMemory) return inMemory
  try {
    const stored = await AsyncStorage.getItem(STORAGE_PREFIX + key)
    if (!stored) return null
    const parsed: RouteCoordinate[] = JSON.parse(stored)
    memoryCache.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

export const setCachedRoute = async (key: string, coords: RouteCoordinate[]) => {
  const rounded = coords.map((c) => ({ latitude: round(c.latitude), longitude: round(c.longitude) }))
  memoryCache.set(key, rounded)
  try {
    await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(rounded))
  } catch {
    // la cache su disco è solo un'ottimizzazione
  }
}
