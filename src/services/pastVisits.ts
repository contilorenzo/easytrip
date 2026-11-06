import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

// Un viaggio fatto prima di usare l'app: paese e periodo (anno, mese facoltativo)
export interface PastVisit {
  id: string
  countryCode: string
  countryName: string
  year: number
  month?: number | null
}

const GUEST = 'guest'
const key = (userId: string | null) => `pastVisits:v1:${userId ?? GUEST}`

const readLocal = async (userId: string | null): Promise<PastVisit[]> => {
  try {
    const stored = await AsyncStorage.getItem(key(userId))
    return stored ? (JSON.parse(stored) as PastVisit[]) : []
  } catch {
    return []
  }
}

const writeLocal = (userId: string | null, visits: PastVisit[]) =>
  AsyncStorage.setItem(key(userId), JSON.stringify(visits)).catch(() => {})

const fromRow = (row: any): PastVisit => ({
  id: row.id,
  countryCode: row.country_code,
  countryName: row.country_name,
  year: row.year,
  month: row.month,
})

const toRow = (visit: PastVisit) => ({
  id: visit.id,
  country_code: visit.countryCode,
  country_name: visit.countryName,
  year: visit.year,
  month: visit.month ?? null,
})

export const newVisitId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

// Legge i viaggi precedenti. Senza account restano sul telefono; con l'account stanno anche su Supabase:
// quelli inseriti prima di accedere vengono caricati sull'account e poi tolti dallo spazio "ospite"
export const loadPastVisits = async (userId: string | null): Promise<PastVisit[]> => {
  if (!userId) return readLocal(null)

  const cached = await readLocal(userId)
  try {
    const { data, error } = await supabase.from('past_visits').select('*').order('year', { ascending: false })
    if (error) throw error
    const remote = (data ?? []).map(fromRow)

    const guest = await readLocal(null)
    if (guest.length > 0) {
      const { error: uploadError } = await supabase.from('past_visits').upsert(guest.map(toRow))
      if (!uploadError) {
        await AsyncStorage.removeItem(key(null)).catch(() => {})
        remote.push(...guest.filter((visit) => !remote.some((r) => r.id === visit.id)))
      }
    }
    await writeLocal(userId, remote)
    return remote
  } catch {
    return cached
  }
}

export const addPastVisit = async (userId: string | null, visits: PastVisit[], visit: PastVisit): Promise<PastVisit[]> => {
  const next = [visit, ...visits]
  await writeLocal(userId, next)
  if (userId) {
    const { error } = await supabase.from('past_visits').upsert(toRow(visit))
    if (error) throw error
  }
  return next
}

export const removePastVisit = async (userId: string | null, visits: PastVisit[], id: string): Promise<PastVisit[]> => {
  const next = visits.filter((visit) => visit.id !== id)
  await writeLocal(userId, next)
  if (userId) {
    const { error } = await supabase.from('past_visits').delete().eq('id', id)
    if (error) throw error
  }
  return next
}
