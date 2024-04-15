import React from 'react'
import { Text, TextStyle, View, ViewStyle } from 'react-native'
import { mockTrips } from '../../../mocks/trips'
import TripCard from './TripCard/TripCard'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'

const TripsList = () => {
  return (
    <View style={wrapperStyles}>
      <Text style={textStyles}>{t(TranslationsKeys.yourTrips)}</Text>
      {mockTrips.map((trip) => (
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
