import React from 'react'
import { Text, TextStyle, View, ViewStyle, Platform } from 'react-native'
import TripCard from './TripCard/TripCard'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import { createTripsTable, formatTrips, loadTrips } from '../common/db/utils'
import { Trip } from './types'
import { useFocusEffect } from '@react-navigation/native'
import { mockTrips } from '../../../mocks/trips'
import { useTripsContext } from '../../state/TripsContext'
import { isAfter, isBefore } from 'date-fns'

const TripsList = ({ navigation }: Props) => {
  const context = useTripsContext()

  useFocusEffect(
    React.useCallback(() => {
      context.setCurrentTrip(null)

      const fetchData = async () => {
        if (context.trips.length === 0) {
          if (Platform.OS !== 'web') {
            await createTripsTable()
            await loadTrips(context)
          } else {
            context.setTrips(formatTrips(mockTrips))
          }
        }
      }

      fetchData()
    }, [])
  )

  const upcomingTrips = context.trips.filter((trip) =>
    isAfter(trip.startDate, new Date())
  )
  const pastTrips = context.trips
    .filter((trip) => isBefore(trip.startDate, new Date()))
    .reverse()

  return (
    <>
      {context.trips.length > 0 && (
        <View style={wrapperStyles}>
          {upcomingTrips.length > 0 && (
            <Text style={textStyles}>{t(TranslationsKeys.upcomingTrips)}</Text>
          )}
          <View style={tripsListStyles}>
            {upcomingTrips.map((trip: Trip) => (
              <TripCard trip={trip} key={trip.id} navigation={navigation} />
            ))}
          </View>
          {pastTrips.length > 0 && (
            <Text style={{ ...textStyles, marginTop: 30 }}>
              {t(TranslationsKeys.pastTrips)}
            </Text>
          )}
          <View style={tripsListStyles}>
            {pastTrips.map((trip: Trip) => (
              <TripCard
                trip={trip}
                key={trip.id}
                navigation={navigation}
                isFinished
              />
            ))}
          </View>
        </View>
      )}
    </>
  )
}

interface Props {
  navigation: any
}

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
  paddingBottom: 20,
  paddingTop: 24,
}

const tripsListStyles: ViewStyle = {
  gap: 10,
  alignItems: 'center',
  width: '100%',
}

const textStyles: TextStyle = {
  color: 'darkgray',
  fontWeight: '800',
  marginBottom: 5,
  paddingBottom: 5,
  textAlign: 'center',
  width: '90%',
}

export default TripsList
