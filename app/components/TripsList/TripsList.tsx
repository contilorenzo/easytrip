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

const TripsList = ({ navigation }: Props) => {
  const context = useTripsContext()

  useFocusEffect(() => {
    context.setCurrentTrip(null)

    if (context.trips.length === 0) {
      if (Platform.OS !== 'web') {
        createTripsTable()
        loadTrips(context)
      } else {
        context.setTrips(formatTrips(mockTrips))
      }
    }
  })

  return (
    <>
      {context.trips.length > 0 && (
        <View style={wrapperStyles}>
          <Text style={textStyles}>{t(TranslationsKeys.yourTrips)}</Text>
          <View style={tripsListStyles}>
            {context.trips.map((trip: Trip) => (
              <TripCard trip={trip} key={trip.id} navigation={navigation} />
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
  paddingTop: 24
}

const tripsListStyles: ViewStyle = {
  gap: 10,
  alignItems: 'center',
  width: '100%',
}

const textStyles: TextStyle = {
  borderBottomColor: 'lightgray',
  borderBottomWidth: 1,
  color: 'darkgray',
  fontWeight: '800',
  marginBottom: 5,
  paddingBottom: 5,
  textAlign: 'center',
  width: '90%',
}

export default TripsList
