import React, { useEffect } from 'react'
import { ViewStyle, View, TextStyle, Text } from 'react-native'
import { Trip } from '../TripsList/types'
import { format } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'

const TripDetails = ({ trip }: Props) => {
  return (
    <View style={wrapperStyles}>
      <View style={headerStyles}>
        <Text style={cityTextStyles}>{trip.city}</Text>
        <Text style={countryTextStyles}>{trip.country}</Text>
      </View>
      <View style={datesWrapperStyles}>
        <View style={dateStyles}>
          <Text>{format(trip.startDate, 'dd')}</Text>
          <Text>{format(trip.startDate, 'MMMM')}</Text>
        </View>
        <View>
          <Ionicons name="arrow-forward" style={iconStyles} size={20} />
        </View>
        <View style={dateStyles}>
          <Text>{format(trip.endDate, 'dd')}</Text>
          <Text>{format(trip.endDate, 'MMMM')}</Text>
        </View>
      </View>
    </View>
  )
}

interface Props {
  trip: Trip
}

const wrapperStyles: ViewStyle = {}

const countryTextStyles: TextStyle = {
  color: 'grey',
  fontSize: 16,
}

const cityTextStyles: TextStyle = {
  fontSize: 26,
  fontWeight: 'bold',
  textTransform: 'uppercase',
}

const headerStyles: TextStyle = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-around',
  marginTop: 10
}

const datesWrapperStyles: TextStyle = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-evenly',
  marginTop: 20,
}

const dateStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
}

const iconStyles: TextStyle = {
  color: 'gray',
}

export default TripDetails