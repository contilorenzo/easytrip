import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'
import {
  FlightError,
  FlightQuery,
  FlightResult,
  cheapestFlightsWith,
  isIata,
} from './flightLogic'

export type { FlightOffer, FlightResult } from './flightLogic'

export interface Place {
  code: string
  type: 'city' | 'airport'
  name: string
  cityName: string
  countryCode: string
  countryName: string
}

const ENABLED_KEY = 'flights.enabled'
const ORIGIN_KEY = 'flights.origin'
const IATA_CACHE_PREFIX = 'flights.iata.'

// In sviluppo (solo con __DEV__) si può simulare il server con EXPO_PUBLIC_FLIGHTS_MOCK=1:
// il nome della destinazione sceglie lo scenario ("errore", "offline", "limite", "vuota", "lenta")
const MOCK = __DEV__ && process.env.EXPO_PUBLIC_FLIGHTS_MOCK === '1'

// ---------- Impostazioni (con piccolo sistema di notifica per aggiornare le schermate aperte) ----------

export interface FlightSettings {
  enabled: boolean
  origin: Place | null
}

let settings: FlightSettings = { enabled: true, origin: null }
let loaded: Promise<void> | null = null
const listeners = new Set<() => void>()

const notify = () => listeners.forEach((l) => l())

export const subscribeFlightSettings = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getFlightSettings = () => settings

export const loadFlightSettings = (): Promise<void> => {
  if (!loaded) {
    loaded = (async () => {
      try {
        const [enabled, origin] = await Promise.all([AsyncStorage.getItem(ENABLED_KEY), AsyncStorage.getItem(ORIGIN_KEY)])
        settings = { enabled: enabled !== '0', origin: origin ? (JSON.parse(origin) as Place) : null }
      } catch {
        // restano i valori predefiniti
      }
      notify()
    })()
  }
  return loaded
}

export const setFlightsEnabled = async (enabled: boolean) => {
  settings = { ...settings, enabled }
  notify()
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0')
  } catch {}
}

export const setFlightOrigin = async (origin: Place) => {
  settings = { ...settings, origin }
  notify()
  try {
    await AsyncStorage.setItem(ORIGIN_KEY, JSON.stringify(origin))
  } catch {}
}

// ---------- Server ----------

const MOCK_PLACES: Place[] = [
  { code: 'MIL', type: 'city', name: 'Milano', cityName: 'Milano', countryCode: 'it', countryName: 'Italia' },
  { code: 'BGY', type: 'airport', name: 'Orio al Serio', cityName: 'Bergamo', countryCode: 'it', countryName: 'Italia' },
  { code: 'ROM', type: 'city', name: 'Roma', cityName: 'Roma', countryCode: 'it', countryName: 'Italia' },
]

// Nessuna richiesta deve lasciare lo spinner acceso all'infinito
const REQUEST_TIMEOUT_MS = 15000
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new FlightError('unavailable', 'timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Errore della funzione → motivo comprensibile
const explain = async (error: any): Promise<FlightError> => {
  const status = error?.context?.status
  if (status === 429) return new FlightError('rate_limit')
  if (status === 503) return new FlightError('not_configured')
  if (status) return new FlightError('unavailable')
  return new FlightError('offline')
}

export const searchPlaces = async (term: string): Promise<Place[]> => {
  const clean = term.trim()
  if (clean.length < 2) return []
  if (MOCK) {
    await delay(300)
    return MOCK_PLACES.filter((p) => p.cityName.toLowerCase().includes(clean.toLowerCase()) || p.name.toLowerCase().includes(clean.toLowerCase()))
  }
  const { data, error } = await supabase.functions.invoke('flight-prices', { body: { action: 'places', term: clean } })
  if (error) throw await explain(error)
  return Array.isArray(data?.places) ? (data.places as Place[]) : []
}

// Codice IATA della destinazione: si cerca la città e si tiene il risultato dello stesso paese; il risultato resta in cache
export const resolveDestination = async (city: string, countryId: string): Promise<string | null> => {
  const key = `${IATA_CACHE_PREFIX}${countryId.toLowerCase()}.${city.trim().toLowerCase()}`
  try {
    const cached = await AsyncStorage.getItem(key)
    if (cached && isIata(cached)) return cached
  } catch {}
  if (MOCK) return 'LIS'
  const places = await searchPlaces(city)
  const country = countryId.toLowerCase()
  const match = places.find((p) => p.type === 'city' && p.countryCode === country) ?? places.find((p) => p.countryCode === country)
  if (!match) return null
  try {
    await AsyncStorage.setItem(key, match.code)
  } catch {}
  return match.code
}

const MOCK_OFFERS = (q: FlightQuery) => ({
  offers: [
    { price: 142, currency: 'EUR', airline: 'FR', departureAt: q.dateFrom, returnAt: q.dateTo, transfers: 0, url: 'https://www.aviasales.com/search/demo' },
    { price: 96, currency: 'EUR', airline: 'U2', departureAt: q.dateFrom.slice(0, 8) + '25', returnAt: q.dateTo.slice(0, 8) + '28', transfers: 1, url: 'https://www.aviasales.com/search/demo2' },
  ],
})

const fetchRemote = async (q: FlightQuery, destinationName?: string) => {
  if (MOCK) {
    const name = (destinationName || '').toLowerCase()
    if (name.includes('lenta')) await delay(60000)
    await delay(900)
    if (name.includes('offline')) throw new FlightError('offline')
    if (name.includes('limite')) throw new FlightError('rate_limit')
    if (name.includes('errore')) throw new FlightError('unavailable')
    if (name.includes('vuota')) return { offers: [] }
    // "altre": nessun volo per le date scelte, solo per altre date
    if (name.includes('altre')) return { offers: MOCK_OFFERS(q).offers.slice(1) }
    return MOCK_OFFERS(q)
  }
  const { data, error } = await supabase.functions.invoke('flight-prices', {
    body: { action: 'prices', origin: q.origin, destination: q.destination, dateFrom: q.dateFrom, dateTo: q.dateTo },
  })
  if (error) throw await explain(error)
  return data
}

// Prezzi più bassi indicativi per un viaggio (cache locale di 12 ore, ultimo risultato noto se si è offline)
export const cheapestFlights = (
  query: FlightQuery,
  destinationName?: string
): Promise<FlightResult> =>
  cheapestFlightsWith(query, {
    storage: AsyncStorage,
    fetchRemote: (q) => withTimeout(fetchRemote(q, destinationName), REQUEST_TIMEOUT_MS),
  })

// Apre il link di affiliazione in un browser dentro l'app (si resta nell'app e il tracciamento dell'affiliazione funziona);
// se non è disponibile, nel browser di sistema
export const openAffiliateLink = async (url: string) => {
  if (!/^https:\/\//.test(url)) return
  try {
    await WebBrowser.openBrowserAsync(url, { toolbarColor: '#FFFFFF', controlsColor: '#0284C7' })
  } catch {
    try {
      await Linking.openURL(url)
    } catch {
      // niente da fare se non c'è un browser
    }
  }
}
