import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import { TripStep } from '../components/TripDetails/TripSteps/types'

export interface TripDatesChange {
  // Di quanti giorni si sposta l'inizio del viaggio (positivo = più avanti)
  shiftDays: number
  // Tappe che restano, già spostate
  keptSteps: TripStep<any>[]
  // Tappe che non rientrano più nel viaggio (iniziano dopo l'ultimo giorno): verranno eliminate
  removedSteps: TripStep<any>[]
}

// Calcola cosa succede alle tappe quando cambiano le date del viaggio:
// 1. tutte le tappe si spostano dello stesso numero di giorni dell'inizio, mantenendo orario e ordine;
// 2. quelle che iniziano dopo il nuovo ultimo giorno non ci stanno e vengono eliminate.
export const previewTripDatesChange = (
  steps: TripStep<any>[] | undefined,
  oldStart: Date,
  newStart: Date,
  newEnd: Date
): TripDatesChange => {
  const shiftDays = differenceInCalendarDays(newStart, oldStart)
  const lastDay = startOfDay(newEnd).getTime()

  const keptSteps: TripStep<any>[] = []
  const removedSteps: TripStep<any>[] = []

  ;(steps ?? []).forEach((step) => {
    const shifted: TripStep<any> = {
      ...step,
      startDateTime: addDays(new Date(step.startDateTime), shiftDays).toISOString(),
      endDateTime: addDays(new Date(step.endDateTime), shiftDays).toISOString(),
    }
    if (startOfDay(new Date(shifted.startDateTime)).getTime() > lastDay) removedSteps.push(step)
    else keptSteps.push(shifted)
  })

  return { shiftDays, keptSteps, removedSteps }
}
