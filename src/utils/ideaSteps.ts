import { addDays, addMinutes, differenceInCalendarDays, setHours, setMinutes, startOfDay } from 'date-fns'
import { IdeaAttraction, ItineraryStep } from '../services/tripIdeas'
import { StepType, TripStep } from '../components/TripDetails/TripSteps/types'

const FIRST_START_HOUR = 9
const STEP_MINUTES = 75
const SLOT_MINUTES = 105 // durata + spostamento
const MAX_PER_DAY = 8

// Distribuisce le tappe proposte sui giorni del viaggio, in ordine, a partire dalle 9:00
export const buildIdeaSteps = (
  attractions: IdeaAttraction[],
  city: string,
  startDate: Date,
  endDate: Date
): TripStep<any>[] => {
  const days = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1)
  const total = Math.min(attractions.length, days * MAX_PER_DAY)
  const base = Math.floor(total / days)
  const extra = total % days

  const steps: TripStep<any>[] = []
  let cursor = 0
  for (let day = 0; day < days && cursor < total; day++) {
    const count = base + (day < extra ? 1 : 0)
    const dayStart = setMinutes(setHours(addDays(startOfDay(startDate), day), FIRST_START_HOUR), 0)
    for (let i = 0; i < count; i++) {
      const attraction = attractions[cursor++]
      const start = addMinutes(dayStart, i * SLOT_MINUTES)
      const hasPosition = attraction.lat !== undefined && attraction.lng !== undefined
      steps.push({
        type: StepType.VISIT,
        title: attraction.name,
        startDateTime: start.toISOString(),
        endDateTime: addMinutes(start, STEP_MINUTES).toISOString(),
        extraData: hasPosition
          ? {
              location: {
                name: attraction.name,
                address: `${attraction.name}, ${city}`,
                coordinates: { lat: attraction.lat as number, lng: attraction.lng as number },
              },
            }
          : {},
      })
    }
  }
  return steps
}

// Programma generato dal server: ogni passo ha già giorno, orario e durata
export const buildItinerarySteps = (itinerary: ItineraryStep[], startDate: Date, endDate: Date): TripStep<any>[] => {
  const days = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1)
  return itinerary
    .filter((step) => step.day <= days)
    .map((step) => {
      const start = setMinutes(setHours(addDays(startOfDay(startDate), step.day - 1), step.startHour), step.startMinute)
      return {
        type: step.type === 'food' ? StepType.FOOD : StepType.VISIT,
        title: step.title,
        startDateTime: start.toISOString(),
        endDateTime: addMinutes(start, step.durationMinutes).toISOString(),
        extraData: {
          location: {
            name: step.placeName,
            address: step.address || step.placeName,
            coordinates: { lat: step.lat, lng: step.lng },
          },
        },
      }
    })
}
