import React from 'react'
import { ViewStyle, View, TextStyle, Text } from 'react-native'
import { StepType, Trip, TripStep } from '../TripsList/types'
import { format } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'
import TripSteps from './TripSteps/TripSteps'

const mockSteps: TripStep[] = [
  {
    type: StepType.JOURNEY,
    title: 'Aereo BGY - ZAD',
    startDateTime: '2024-06-14T06:00:00.000Z',
    endDateTime: '2024-06-14T07:10:00.000Z',
  },
  {
    type: StepType.VISIT,
    title: 'Petrcane Beach',
    startDateTime: '2024-06-14T09:00:00.000Z',
    endDateTime: '2024-06-14T12:00:00.000Z',
  },
  {
    type: StepType.JOURNEY,
    title: 'Viaggio in auto',
    startDateTime: '2024-06-14T12:00:00.000Z',
    endDateTime: '2024-06-14T14:00:00.000Z',
  },
  {
    type: StepType.VISIT,
    title: 'Laghi Plitvice',
    startDateTime: '2024-06-14T14:00:00.000Z',
    endDateTime: '2024-06-14T22:00:00.000Z',
  },
  {
    type: StepType.JOURNEY,
    title: 'Rientro a Zara',
    startDateTime: '2024-06-14T22:00:00.000Z',
    endDateTime: '2024-06-14T23:00:00.000Z',
  },
  {
    type: StepType.ACCOMODATION,
    title: 'Apartments Jermen',
    startDateTime: '2024-06-14T23:00:00.000Z',
    endDateTime: '2024-06-15T09:00:00.000Z',
  },
]

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
      <TripSteps steps={trip.steps ?? mockSteps} />
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
  marginTop: 10,
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
