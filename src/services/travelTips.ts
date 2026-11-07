import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { Tip, TipsQuery, tipsWith } from './tipsLogic'

export type { Tip, TipKind } from './tipsLogic'
export { openAffiliateLink } from './flightSuggestions'

const ENABLED_KEY = 'tips.enabled'
const MOCK = __DEV__ && process.env.EXPO_PUBLIC_FLIGHTS_MOCK === '1'

let enabled = true
const listeners = new Set<() => void>()
let loaded: Promise<void> | null = null

export const getTipsEnabled = () => enabled
export const subscribeTips = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export const loadTipsSettings = () => {
  if (!loaded) {
    loaded = AsyncStorage.getItem(ENABLED_KEY)
      .then((v) => {
        enabled = v !== '0'
      })
      .catch(() => {})
      .then(() => listeners.forEach((l) => l()))
  }
  return loaded
}
export const setTipsEnabled = async (value: boolean) => {
  enabled = value
  listeners.forEach((l) => l())
  try {
    await AsyncStorage.setItem(ENABLED_KEY, value ? '1' : '0')
  } catch {}
}

const fetchRemote = async (q: TipsQuery) => {
  if (MOCK) {
    return {
      items: [
        { kind: 'experiences', partner: 'Tiqets', url: 'https://www.tiqets.com/en/search?q=demo', cityLevel: true, dated: false },
        { kind: 'luggage', partner: 'Radical Storage', url: 'https://radicalstorage.com/storage-list/demo', cityLevel: true, dated: true },
        { kind: 'car', partner: 'Localrent', url: 'https://www.localrent.com/en/portugal/lisbon/?pickup_date=2026-12-15&dropoff_date=2026-12-19', cityLevel: true, dated: true },
        { kind: 'transfer', partner: 'Welcome Pickups', url: 'https://www.welcomepickups.com/lisbon/', cityLevel: true, dated: false },
        { kind: 'esim', partner: 'Airalo', url: 'https://www.airalo.com/portugal-esim', cityLevel: false, dated: false },
      ],
    }
  }
  const { data, error } = await supabase.functions.invoke('flight-prices', { body: { action: 'tips', city: q.city, country: q.country, dateFrom: q.dateFrom, dateTo: q.dateTo } })
  if (error) throw error
  return data
}

export const travelTips = (query: TipsQuery): Promise<Tip[]> => tipsWith(query, { storage: AsyncStorage, fetchRemote })
