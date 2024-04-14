import React from 'react'
import { Trip } from '../types'
import {
  Text,
  TouchableOpacity,
  ViewStyle,
  View,
  TextStyle,
} from 'react-native'

const getRemainingDays = (dateUntil: Date): string => {
  const diff = Math.abs(dateUntil.getTime() - new Date().getTime())
  return Math.ceil(diff / (1000 * 3600 * 24)).toString()
}

const TripCard = ({ trip }: Props) => {
  return (
    <TouchableOpacity style={wrapperStyles}>
      <View style={gridStyles}>
        <Text style={cityNameStyles}>{trip.city}</Text>
        <View>
          <Text>Tra</Text>
          <Text style={remainingDaysStyles}>
            {getRemainingDays(trip.startDate)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

interface Props {
  trip: Trip
}

const wrapperStyles: ViewStyle = {
  borderRadius: 10,
  padding: 10,
  backgroundColor: 'lightgray',
  width: '100%',
}

const gridStyles: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const cityNameStyles: TextStyle = {
  fontSize: 18,
  fontWeight: '600',
  textTransform: 'capitalize',
}

const remainingDaysStyles: TextStyle = {
  fontWeight: '600',
  textAlign: 'right',
}

export default TripCard
