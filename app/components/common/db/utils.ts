import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'
import { NewTrip, Trip } from '../../TripsList/types'
import { TripStep } from '../../TripDetails/TripSteps/types'

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

export const createTripsTable = (db: SQLite.SQLiteDatabase) => {
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

export const saveTrip = (db: SQLite.SQLiteDatabase, trip: NewTrip) => {
  db.transaction((tx) => {
    tx.executeSql(
      `insert into trips (city, country, startDate, endDate) values ('${trip.city}', '${trip.country}', '${trip.startDate}', '${trip.endDate}')`,
      null,
      null,
      (_, error) => {
        console.log(error)
        return true
      }
    )
  })
}

export const addStep = async (newStep: TripStep<any>, trip: Trip) => {
  const db = getDatabase()
  db.transaction(async (tx) => {
    let steps = trip.steps ?? []
    steps.push(newStep)

    alert('pushing: ' + JSON.stringify(steps))

    await tx.executeSql(
      `UPDATE trips SET steps='${JSON.stringify(steps)}' WHERE id=${trip.id}`,
      null,
      null,
      (_, error) => {
        console.log(error)
        return true
      }
    )
  })
}
