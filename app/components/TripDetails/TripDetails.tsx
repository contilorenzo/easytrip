import React from 'react'
import { ViewStyle, View, TextStyle, Text } from 'react-native'
import { format } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'
import TripSteps from './TripSteps/TripSteps'
import { useTripsContext } from '../../state/TripsContext'
import { Image } from 'react-native'
import CountryFlag from '../common/CountryFlag/CountryFlag'

const TripDetails = ({ navigation }: Props) => {
  const trip = useTripsContext().currentTrip

  return trip ? (
    <View style={wrapperStyles}>
      <View style={headerStyles}>
        <Text style={cityTextStyles}>{trip.city}</Text>
        <View style={countryStyles}>
          <CountryFlag countryCode={trip.country.id} height={20} isCircle />
          <Text style={countryTextStyles}>{trip.country?.title}</Text>
        </View>
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
      <TripSteps steps={trip.steps} navigation={navigation} />
    </View>
  ) : (
    <></>
  )
}

interface Props {
  navigation: any
}

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
}

const countryStyles: ViewStyle = {
  columnGap: 6,
  display: 'flex',
  flexDirection: 'row',
  marginTop: 2,
}

const countryTextStyles: TextStyle = {
  color: 'grey',
  fontSize: 16,
}

const cityTextStyles: TextStyle = {
  fontSize: 26,
  fontWeight: '800',
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
  columnGap: 25,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  marginTop: 20,
  width: '70%',
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
