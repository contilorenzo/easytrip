import React, { useState } from 'react'
import { Text, TextStyle, View, ViewStyle, Platform } from 'react-native'
import TripCard from './TripCard/TripCard'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import * as SQLite from 'expo-sqlite'
import { createTripsTable, getDatabase } from '../common/db/utils'
import { Trip, TripDTO } from './types'
import { useFocusEffect } from '@react-navigation/native'
import { mockTrips } from '../../../mocks/trips'
import { TripStep } from '../TripDetails/TripSteps/types'
import { isAfter } from 'date-fns'

const formatTrips = (trips: TripDTO[]): Trip[] => {
  const formattedTrips = trips.map((trip) => ({
    ...trip,
    startDate: new Date(trip.startDate),
    endDate: new Date(trip.endDate),
    steps: sortByStartTime(JSON.parse(trip.steps)),
  }))

  return formattedTrips
}

const sortByStartTime = (steps: TripStep<any>[]) => {
  const detachedSteps = [...steps]

  detachedSteps.sort((a, b) => {
    var dateA = new Date(a.startDateTime)
    var dateB = new Date(b.startDateTime)
    return isAfter(dateA, dateB) ? 1 : -1
  })

  return detachedSteps
}

const TripsList = ({ navigation }: Props) => {
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
    } else setTrips(mockTrips)
  })

  return (
    <View style={wrapperStyles}>
      <Text style={textStyles}>{t(TranslationsKeys.yourTrips)}</Text>
      {trips.map((trip) => (
        <TripCard trip={trip} key={trip.id} navigation={navigation} />
      ))}
    </View>
  )
}

interface Props {
  navigation: any
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
