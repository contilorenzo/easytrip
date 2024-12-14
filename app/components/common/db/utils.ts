import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'
import { NewTrip, Trip, TripDTO } from '../../TripsList/types'
import { TripStep } from '../../TripDetails/TripSteps/types'
import { isAfter } from 'date-fns'
import { TripsContextState } from '../../../state'
import { Popup } from 'react-native-popup-confirm-toast'
import { TranslationsKeys } from '../../../translations/types'
import { t } from '../../../translations'

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (Platform.OS === 'web') {
    return {
      transaction: () => {
        return {
          executeSql: () => {},
        }
      },
    } as unknown as SQLite.SQLiteDatabase
  }

  return await SQLite.openDatabaseAsync('db.db')
}

export const createTripsTable = async () => {
  const db = await getDatabase()

  try {
    await db.execAsync(
      'create table if not exists trips (id integer primary key not null, city text, country text, startDate text, endDate text, steps text);'
    )
  } catch (error) {
    console.error(error)
  }
}

export const loadTrips = async (context: TripsContextState) => {
  const db = await getDatabase()

  try {
    const rows: TripDTO[] = await db.getAllAsync('select * from trips')
    context.setTrips(formatTrips(rows))
  } catch (error) {
    console.error(error)
  }
}

export const formatTrips = (trips: TripDTO[]): Trip[] => {
  const formattedTrips = trips.map((trip) => ({
    ...trip,
    startDate: new Date(trip.startDate),
    endDate: new Date(trip.endDate),
    steps: sortStepsByStartTime(JSON.parse(trip.steps)),
    country: JSON.parse(trip.country),
  }))

  return sortTripsByDate(formattedTrips)
}

const sortStepsByStartTime = (steps: TripStep<any>[]) => {
  const detachedSteps = [...steps]

  detachedSteps.sort((a, b) => {
    var dateA = new Date(a.startDateTime)
    var dateB = new Date(b.startDateTime)
    return isAfter(dateA, dateB) ? 1 : -1
  })

  return detachedSteps
}

const sortTripsByDate = (trips: Trip[]) => {
  const detachedTrips = [...trips]

  detachedTrips.sort((a, b) => {
    var dateA = new Date(a.startDate)
    var dateB = new Date(b.startDate)
    return isAfter(dateA, dateB) ? 1 : -1
  })

  return detachedTrips
}

export const addTrip = async (trip: NewTrip, context: TripsContextState) => {
  const db = await getDatabase()
  const JSONCountry = JSON.stringify(trip.country)

  try {
    await db.runAsync(
      `insert into trips (city, country, startDate, endDate, steps) values ('${trip.city}', '${JSONCountry}', '${trip.startDate}', '${trip.endDate}', '[]')`
    )
    await loadTrips(context)
  } catch (error) {
    console.error(error)
  }
}

export const removeTrip = async (
  tripId: number,
  context: TripsContextState
) => {
  const db = await getDatabase()

  Popup.show({
    // @ts-ignore
    type: 'confirm',
    title: t(TranslationsKeys.trip_removeConfirmTitle),
    textBody: t(TranslationsKeys.trip_removeConfirmDescription),
    buttonText: t(TranslationsKeys.confirm),
    confirmText: t(TranslationsKeys.cancel),
    bounciness: 5,
    startDuration: 100,
    hiddenDuration: 100,
    callback: async () => {
      try {
        db.execAsync(`DELETE FROM trips WHERE id=${tripId}`)
        await loadTrips(context)
      } catch (error) {
        console.error(error)
      }
      Popup.hide()
    },
    cancelCallback: () => {
      Popup.hide()
    },
  })
}

export const addStep = async (
  newStep: TripStep<any>,
  context: TripsContextState
) => {
  const db = await getDatabase()
  const trip = context.currentTrip

  let steps = trip.steps ?? []
  steps.push(newStep)

  try {
    await db.runAsync(
      `UPDATE trips SET steps='${JSON.stringify(steps)}' WHERE id=${trip.id}`
    )
    await loadTrips(context)
  } catch (error) {
    console.error(error)
  }
}

export const updateStep = async (
  originalStep: TripStep<any>,
  newStep: TripStep<any>,
  context: TripsContextState
) => {
  const db = await getDatabase()
  const trip = context.currentTrip

  let steps = trip.steps ?? []
  const filteredSteps = steps.filter(
    (step) =>
      step.title !== originalStep.title &&
      step.startDateTime !== originalStep.startDateTime &&
      step.endDateTime !== originalStep.endDateTime
  )
  filteredSteps.push(newStep)

  console.log(newStep)

  try {
    await db.runAsync(
      `UPDATE trips SET steps='${JSON.stringify(filteredSteps)}' WHERE id=${
        trip.id
      }`
    )
    await loadTrips(context)
  } catch (error) {
    console.error(error)
  }
}

export const removeStep = async (
  stepToRemove: TripStep<any>,
  context: TripsContextState
) => {
  const db = await getDatabase()
  const trip = context.currentTrip

  let steps = trip.steps ?? []
  const filteredSteps = steps.filter(
    (step) =>
      step.title !== stepToRemove.title &&
      step.startDateTime !== stepToRemove.startDateTime &&
      step.endDateTime !== stepToRemove.endDateTime
  )

  try {
    await db.runAsync(
      `UPDATE trips SET steps='${JSON.stringify(filteredSteps)}' WHERE id=${
        trip.id
      }`
    )
    await loadTrips(context)
  } catch (error) {
    console.error(error)
  }
}

const deleteDB = async () => {
  const db = await getDatabase()
  await db.execAsync(`DROP TABLE IF EXISTS trips`)
}
