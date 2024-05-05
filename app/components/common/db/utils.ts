import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'
import { NewTrip, TripDTO } from '../../TripsList/types'

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
      'create table if not exists trips (id integer primary key not null, city text, country text, startDate text, endDate text);',
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
