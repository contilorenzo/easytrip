import React, { useState } from 'react'
import { Text, TextStyle, View, ViewStyle, Platform } from 'react-native'
import TripCard from './TripCard/TripCard'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import * as SQLite from 'expo-sqlite'
import { createTripsTable, getDatabase } from '../common/db/utils'
import { Trip, TripDTO } from './types'
import { useFocusEffect } from '@react-navigation/native'

const formatTrips = (trips: TripDTO[]): Trip[] => {
  const formattedTrips = trips.map((trip) => ({
    ...trip,
    startDate: new Date(trip.startDate),
    endDate: new Date(trip.endDate),
  }))

  return formattedTrips
}

const TripsList = () => {
  const [trips, setTrips] = useState<Trip[]>([])
  const db = getDatabase()

  useFocusEffect(() => {
    if (Platform.OS !== 'web') {
      createTripsTable(db as SQLite.SQLiteDatabase)

      db.transaction((tx) => {
        tx.executeSql(
          `select * from trips`,
          undefined,
          (_, { rows: { _array } }) => setTrips(formatTrips(_array))
        )
      })
    }
  })

  return (
    <View style={wrapperStyles}>
      <Text style={textStyles}>{t(TranslationsKeys.yourTrips)}</Text>
      {trips.map((trip) => (
        <TripCard trip={trip} key={trip.id} />
      ))}
    </View>
  )
}

const wrapperStyles: ViewStyle = {
  gap: 5,
  alignItems: 'center',
}

const textStyles: TextStyle = {
  borderBottomColor: 'lightgray',
  borderBottomWidth: 1,
  color: 'darkgray',
  marginBottom: 5,
  paddingBottom: 5,
  textAlign: 'center',
  width: '90%',
}

export default TripsList
