import { StepSuggestion } from './aiSuggestions'

// Le coordinate dell'AI sono approssimate e a volte sbagliate: le tengo solo se sono vicine tra loro e alla città.
// Margine sul raggio scelto: le coordinate dell'AI sono approssimate e il centro della città è un punto convenzionale
const RADIUS_TOLERANCE = 1.2
// Dentro lo stesso giorno le tappe devono stare vicine tra loro: metà del raggio, ma mai meno di 15 km
const getMaxFromDayKm = (radiusKm: number) => Math.max(15, radiusKm / 2)

const END_OF_DAY_MINUTES = 24 * 60 // le tappe non possono attraversare la mezzanotte

export interface Point {
  lat: number
  lng: number
}

export const distanceKm = (a: Point, b: Point) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

const median = (values: number[]) => {
  const sorted = [...values].sort((x, y) => x - y)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const medianPoint = (points: Point[]): Point => ({
  lat: median(points.map((p) => p.lat)),
  lng: median(points.map((p) => p.lng)),
})

// Orari delle attività di ogni giorno. Orari e durate restano quelli dati dall'AI: l'unico intervento è sulle
// sovrapposizioni, dove la tappa che si accavalla viene spostata subito dopo la fine della precedente.
// Le tappe che così finirebbero oltre la mezzanotte vengono tolte.
export const normalizeDayTimes = (suggestions: StepSuggestion[]): StepSuggestion[] => {
  const byDay = new Map<number, StepSuggestion[]>()
  suggestions.forEach((s) => byDay.set(s.day, [...(byDay.get(s.day) ?? []), s]))

  const result: StepSuggestion[] = []

  byDay.forEach((list) => {
    const sorted = [...list].sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute))

    let previousEnd = 0
    sorted.forEach((s) => {
      const start = Math.max(s.startHour * 60 + s.startMinute, previousEnd)
      const end = start + s.durationMinutes
      previousEnd = end
      if (end > END_OF_DAY_MINUTES) return
      result.push({ ...s, startHour: Math.floor(start / 60), startMinute: start % 60 })
    })
  })

  return result.sort((a, b) => a.day - b.day || a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute))
}

// `cityCenter` è il centro della città, se si è riusciti a trovarlo; altrimenti uso il centro delle proposte stesse
export const filterPlausibleSuggestions = (
  suggestions: StepSuggestion[],
  cityCenter: Point | null,
  radiusKm: number
): StepSuggestion[] => {
  if (suggestions.length === 0) return []

  const center = cityCenter ?? medianPoint(suggestions)
  const nearCenter = suggestions.filter((s) => distanceKm(s, center) <= radiusKm * RADIUS_TOLERANCE)

  // Dentro ogni giorno scarto le tappe troppo lontane dalle altre (almeno tre per poter distinguere un'anomalia)
  const byDay = new Map<number, StepSuggestion[]>()
  nearCenter.forEach((s) => byDay.set(s.day, [...(byDay.get(s.day) ?? []), s]))

  const kept: StepSuggestion[] = []
  byDay.forEach((list) => {
    if (list.length < 3) {
      kept.push(...list)
      return
    }
    const dayCenter = medianPoint(list)
    kept.push(...list.filter((s) => distanceKm(s, dayCenter) <= getMaxFromDayKm(radiusKm)))
  })

  return kept
}
