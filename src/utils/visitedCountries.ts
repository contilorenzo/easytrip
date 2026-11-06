import { format, isSameMonth, isSameYear } from 'date-fns'
import { it } from 'date-fns/locale'
import { Trip } from '../components/TripsList/types'
import { PastVisit } from '../services/pastVisits'

export interface VisitEntry {
  // Es. "Lisbona · 2–5 ott 2026" oppure "Giugno 2018"
  label: string
  // Per ordinare dal più recente
  sortKey: number
}

export interface CountrySummary {
  code: string
  title: string
  status: 'visited' | 'upcoming'
  visits: VisitEntry[]
}

export interface CountriesSummary {
  visited: CountrySummary[]
  upcoming: CountrySummary[]
  byCode: Map<string, CountrySummary>
}

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

export const formatPastVisit = (visit: Pick<PastVisit, 'year' | 'month'>) =>
  visit.month ? `${MONTHS[visit.month - 1]} ${visit.year}` : String(visit.year)

const formatTripDates = (start: Date, end: Date) => {
  if (isSameMonth(start, end)) {
    return start.getDate() === end.getDate()
      ? format(start, 'd MMM yyyy', { locale: it })
      : `${format(start, 'd', { locale: it })}–${format(end, 'd MMM yyyy', { locale: it })}`
  }
  if (isSameYear(start, end)) return `${format(start, 'd MMM', { locale: it })} – ${format(end, 'd MMM yyyy', { locale: it })}`
  return `${format(start, 'd MMM yyyy', { locale: it })} – ${format(end, 'd MMM yyyy', { locale: it })}`
}

// Raggruppa viaggi e viaggi precedenti per paese: "visitato" se il viaggio è iniziato (o è un viaggio precedente),
// "in programma" se parte più avanti
export const summarizeCountries = (trips: Trip[], pastVisits: PastVisit[] = [], now = new Date()): CountriesSummary => {
  const entries = new Map<string, CountrySummary>()

  const add = (code: string, title: string, status: 'visited' | 'upcoming', visit: VisitEntry) => {
    const entry = entries.get(code) ?? { code, title, status, visits: [] }
    entry.visits.push(visit)
    // Se ci sono viaggi passati e futuri nello stesso paese, vale "visitato"
    if (status === 'visited') entry.status = 'visited'
    entries.set(code, entry)
  }

  for (const trip of trips) {
    const code = String(trip.country?.id ?? '').toLowerCase()
    if (!code) continue
    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)
    add(code, trip.country?.title ?? code.toUpperCase(), start <= now ? 'visited' : 'upcoming', {
      label: `${trip.city} · ${formatTripDates(start, end)}`,
      sortKey: start.getTime(),
    })
  }

  for (const visit of pastVisits) {
    add(visit.countryCode.toLowerCase(), visit.countryName, 'visited', {
      label: formatPastVisit(visit),
      sortKey: new Date(visit.year, (visit.month ?? 6) - 1, 15).getTime(),
    })
  }

  const all = [...entries.values()]
  for (const entry of all) entry.visits.sort((a, b) => b.sortKey - a.sortKey)
  const sort = (a: CountrySummary, b: CountrySummary) => a.title.localeCompare(b.title, 'it')
  return {
    visited: all.filter((c) => c.status === 'visited').sort(sort),
    upcoming: all.filter((c) => c.status === 'upcoming').sort(sort),
    byCode: entries,
  }
}
