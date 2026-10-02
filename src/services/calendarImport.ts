import * as Calendar from 'expo-calendar/legacy'

export interface CalendarStay {
  id: string
  title: string
  location: string | null
  notes: string
  start: Date
  end: Date
  allDay: boolean
  // Il titolo, le note o il luogo ricordano una prenotazione di alloggio
  likelyStay: boolean
}

const STAY_KEYWORDS = [
  'booking', 'airbnb', 'vrbo', 'hotel', 'hostel', 'b&b', 'bnb', 'alloggio', 'soggiorno', 'prenotazione',
  'check-in', 'check in', 'checkin', 'appartamento', 'apartment', 'resort', 'villa', 'reservation', 'stay', 'camera',
]

const looksLikeStay = (text: string) => {
  const lower = text.toLowerCase()
  return STAY_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export type CalendarImportResult =
  | { status: 'granted'; events: CalendarStay[] }
  | { status: 'denied' }

// Eventi di tutti i calendari del telefono nel periodo indicato
export const getCalendarEvents = async (rangeStart: Date, rangeEnd: Date): Promise<CalendarImportResult> => {
  const permission = await Calendar.requestCalendarPermissionsAsync()
  if (permission.status !== 'granted') return { status: 'denied' }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const events = await Calendar.getEventsAsync(
    calendars.map((c) => c.id),
    rangeStart,
    rangeEnd
  )

  const seen = new Set<string>()
  const stays: CalendarStay[] = []
  events.forEach((event) => {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    // Gli eventi ripetuti compaiono più volte con lo stesso id
    const key = `${event.id}_${start.getTime()}`
    if (seen.has(key)) return
    seen.add(key)
    stays.push({
      id: key,
      title: event.title ?? '',
      location: event.location || null,
      notes: event.notes ?? '',
      start,
      end,
      allDay: !!event.allDay,
      likelyStay: looksLikeStay(`${event.title ?? ''} ${event.location ?? ''} ${event.notes ?? ''}`),
    })
  })

  stays.sort((a, b) => Number(b.likelyStay) - Number(a.likelyStay) || a.start.getTime() - b.start.getTime())
  return { status: 'granted', events: stays }
}
