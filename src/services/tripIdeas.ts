import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

export interface IdeaAttraction {
  name: string
  description?: string
  lat?: number
  lng?: number
}

// Un passo del programma generato dal server (stesso formato dei suggerimenti AI dell'app)
export interface ItineraryStep {
  day: number
  type: 'visit' | 'food'
  title: string
  placeName: string
  address: string
  lat: number
  lng: number
  startHour: number
  startMinute: number
  durationMinutes: number
  description: string
}

export type IdeaCategory = 'weekend' | 'citta' | 'avventura' | 'natura' | 'mare' | 'roadtrip' | 'nightlife'

export const IDEA_CATEGORIES: { id: IdeaCategory; label: string; icon: string }[] = [
  { id: 'weekend', label: 'Weekend', icon: 'cafe-outline' },
  { id: 'citta', label: 'Città', icon: 'business-outline' },
  { id: 'avventura', label: 'Avventura', icon: 'compass-outline' },
  { id: 'natura', label: 'Natura', icon: 'leaf-outline' },
  { id: 'mare', label: 'Mare', icon: 'sunny-outline' },
  { id: 'roadtrip', label: 'Road trip', icon: 'car-outline' },
  { id: 'nightlife', label: 'Nightlife', icon: 'musical-notes-outline' },
]

export interface TripIdea {
  id: string
  category: IdeaCategory
  city: string
  countryId: string
  countryName: string
  // Durata consigliata
  days: number
  tagline: string
  imageUrl?: string
  intro?: string
  attractions: IdeaAttraction[]
  // Programma giorno per giorno (vuoto se non ancora generato)
  itinerary: ItineraryStep[]
}

// Le idee vengono lette dalla tabella trip_ideas, che una Edge Function tiene aggiornata da Wikivoyage.
// Questo elenco serve solo se la tabella è vuota o non raggiungibile (offline al primo avvio).
const FALLBACK_IDEAS: TripIdea[] = [
  { id: 'Lisbona', category: 'citta', city: 'Lisbona', countryId: 'pt', countryName: 'Portogallo', days: 4, tagline: 'Tram gialli e tramonti sul Tago', attractions: [], itinerary: [] },
  { id: 'Kyoto', category: 'citta', city: 'Kyoto', countryId: 'jp', countryName: 'Giappone', days: 6, tagline: 'Templi, giardini zen e geishe', attractions: [], itinerary: [] },
  { id: 'Edimburgo', category: 'weekend', city: 'Edimburgo', countryId: 'gb', countryName: 'Regno Unito', days: 3, tagline: 'Castelli e vicoli medievali', attractions: [], itinerary: [] },
  { id: 'Marrakech', category: 'avventura', city: 'Marrakech', countryId: 'ma', countryName: 'Marocco', days: 5, tagline: 'Souk, spezie e deserto', attractions: [], itinerary: [] },
]

// Tutte le destinazioni attive (poche per categoria), le più recenti per prime
const MAX_SHOWN = 40

const CACHE_KEY = 'tripIdeas:v8'
// Il database cambia al massimo ogni giorno: rileggo solo se la copia sul telefono ha più di 6 ore
const CACHE_TTL = 6 * 60 * 60 * 1000

let memory: TripIdea[] | null = null

const fromRow = (row: any): TripIdea => ({
  id: row.wiki_title,
  category: row.category ?? 'citta',
  city: row.city,
  countryId: row.country_id,
  countryName: row.country_name,
  days: row.days,
  tagline: row.tagline ?? row.fallback_tagline ?? '',
  imageUrl: row.image_url ?? undefined,
  intro: row.intro ?? undefined,
  attractions: Array.isArray(row.attractions) ? row.attractions : [],
  itinerary: Array.isArray(row.itinerary) ? row.itinerary : [],
})

// Legge le idee: usa la copia sul telefono se è recente (meno di 6 ore), altrimenti il database.
// Se la rete non c'è usa l'ultima copia anche se vecchia, poi l'elenco di riserva.
export const loadTripIdeas = async (options: { force?: boolean } = {}): Promise<TripIdea[]> => {
  let stale: TripIdea[] | null = null
  if (options.force) memory = null
  try {
    const stored = await AsyncStorage.getItem(CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as { at: number; ideas: TripIdea[] }
      stale = parsed.ideas
      if (!options.force && Date.now() - parsed.at < CACHE_TTL) {
        memory = parsed.ideas
        return parsed.ideas
      }
    }
  } catch {}

  if (memory && !stale && !options.force) return memory

  try {
    const { data, error } = await supabase.from('trip_ideas').select('*').eq('active', true).order('created_at', { ascending: false }).order('sort_order').limit(MAX_SHOWN)
    if (error) throw error
    if (data?.length) {
      const ideas = data.map(fromRow)
      memory = ideas
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), ideas })).catch(() => {})
      return ideas
    }
  } catch {}

  return stale ?? memory ?? FALLBACK_IDEAS
}
