import React from 'react'
import { Trip } from '../types'
import {
  Text,
  TouchableOpacity,
  ViewStyle,
  View,
  TextStyle,
} from 'react-native'
import { TranslationsKeys } from '../../../translations/types'
import { t } from '../../../translations'

const getRemainingDays = (dateUntil: Date): string => {
  const diff = Math.abs(dateUntil.getTime() - new Date().getTime())
  return Math.ceil(diff / (1000 * 3600 * 24)).toString()
}

const TripCard = ({ trip, navigation }: Props) => {
  const handleTripCardClick = () => {
    navigation.navigate('Details', { trip: trip })
  }

  return (
    <TouchableOpacity style={wrapperStyles} onPress={handleTripCardClick}>
      <View style={gridStyles}>
        <Text style={cityNameStyles}>{trip.city}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text>{t(TranslationsKeys.remainingDays)}</Text>
          <Text style={remainingDaysStyles}>
            {getRemainingDays(trip.startDate) +
              ' ' +
              (+getRemainingDays(trip.startDate) === 1
                ? t(TranslationsKeys.day)
                : t(TranslationsKeys.days))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

interface Props {
  trip: Trip
  navigation: any
}

const wrapperStyles: ViewStyle = {
  borderRadius: 10,
  padding: 10,
  backgroundColor: 'lightgray',
  width: '100%',
}

const gridStyles: ViewStyle = {
  flexDirection: 'row',
  gap: 5,
  justifyContent: 'space-between',
  alignItems: 'center',
}

const cityNameStyles: TextStyle = {
  fontSize: 20,
  fontWeight: '600',
  textTransform: 'capitalize',
}

const remainingDaysStyles: TextStyle = {
  fontSize: 16,
  fontWeight: '600',
  textAlign: 'right',
}

export default TripCard
