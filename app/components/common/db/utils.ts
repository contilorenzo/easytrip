import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'
import { NewTrip, Trip, TripDTO } from '../../TripsList/types'
import { TripStep } from '../../TripDetails/TripSteps/types'
import { isAfter } from 'date-fns'
import { TripsContextState } from '../../../state'
import { Popup } from 'react-native-popup-confirm-toast'
import { TranslationsKeys } from '../../../translations/types'
import { t } from '../../../translations'

export const getDatabase = () => {
  if (Platform.OS === 'web') {
    return {
      transaction: () => {
        return {
          executeSql: () => {},
        }
      },
    }
  }

  return SQLite.openDatabase('db.db')
}

export const createTripsTable = () => {
  const db = getDatabase()

  db.transaction((tx) => {
    tx.executeSql(
      'create table if not exists trips (id integer primary key not null, city text, country text, startDate text, endDate text, steps text);',
      null,
      null,
      (_, error) => {
        console.log(error)
        return true
      }
    )
  })
}

export const loadTrips = (context: TripsContextState) => {
  const db = getDatabase()

  db.transaction((tx) => {
    tx.executeSql(`select * from trips`, undefined, (_, { rows: { _array } }) =>
      context.setTrips(formatTrips(_array))
    )
  })
}

export const formatTrips = (trips: TripDTO[]): Trip[] => {
  const formattedTrips = trips.map((trip) => ({
    ...trip,
    startDate: new Date(trip.startDate),
    endDate: new Date(trip.endDate),
    steps: sortStepsByStartTime(JSON.parse(trip.steps)),
    country: JSON.parse(trip.country),
  }))

  return formattedTrips
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

export const addTrip = (trip: NewTrip, context: TripsContextState) => {
  const db = getDatabase()
  const JSONCountry = JSON.stringify(trip.country)

  db.transaction((tx) => {
    tx.executeSql(
      `insert into trips (city, country, startDate, endDate, steps) values ('${trip.city}', '${JSONCountry}', '${trip.startDate}', '${trip.endDate}', '[]')`,
      null,
      () => {
        loadTrips(context)
      },
      (_, error) => {
        console.error(error)
        return true
      }
    )
  })
}

export const removeTrip = (tripId: number, context: TripsContextState) => {
  const db = getDatabase()

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
    callback: () => {
      db.transaction((tx) => {
        tx.executeSql(
          `DELETE FROM trips WHERE id=${tripId}`,
          null,
          () => {
            loadTrips(context)
          },
          (_, error) => {
            console.error(error)
            return true
          }
        )
      })
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
  const db = getDatabase()
  const trip = context.currentTrip

  db.transaction((tx) => {
    let steps = trip.steps ?? []
    steps.push(newStep)

    tx.executeSql(
      `UPDATE trips SET steps='${JSON.stringify(steps)}' WHERE id=${trip.id}`,
      null,
      () => {
        loadTrips(context)
      },
      (_, error) => {
        console.error(error)
        return true
      }
    )
  })
}

export const removeStep = async (
  stepToRemove: TripStep<any>,
  context: TripsContextState
) => {
  const db = getDatabase()
  const trip = context.currentTrip

  db.transaction((tx) => {
    let steps = trip.steps ?? []
    const filteredSteps = steps.filter(
      (step) =>
        step.title !== stepToRemove.title &&
        step.startDateTime !== stepToRemove.startDateTime &&
        step.endDateTime !== stepToRemove.endDateTime
    )

    tx.executeSql(
      `UPDATE trips SET steps='${JSON.stringify(filteredSteps)}' WHERE id=${
        trip.id
      }`,
      null,
      () => {
        loadTrips(context)
      },
      (_, error) => {
        console.error(error)
        return true
      }
    )
  })
}

const deleteDB = async () => {
  const db = getDatabase()
  db.transaction((tx) => {
    tx.executeSql(`DROP TABLE IF EXISTS trips`, null, null, (_, error) => {
      console.error(error)
      return true
    })
  })
}
