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
import { ROUTES } from '../../common/db/routes'
import { useTripsContext } from '../../../state/TripsContext'
import CountryFlag from '../../common/CountryFlag/CountryFlag'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

const getRemainingDays = (dateUntil: Date): string => {
  const diff = Math.abs(dateUntil.getTime() - new Date().getTime())
  return Math.ceil(diff / (1000 * 3600 * 24)).toString()
}

const TripCard = ({ trip, navigation }: Props) => {
  const context = useTripsContext()

  const handleTripCardClick = () => {
    context.setCurrentTrip(trip)
    navigation.navigate(ROUTES.TRIP_DETAILS)
  }

  return (
    <TouchableOpacity style={wrapperStyles} onPress={handleTripCardClick}>
      <View style={gridStyles}>
        <View style={leftColumnStyles}>
          <View style={destinationStyles}>
            <CountryFlag countryCode={trip.country.id} height={24} isCircle />
            <Text style={cityNameStyles} numberOfLines={1} ellipsizeMode="tail">
              {trip.city}
            </Text>
          </View>
        </View>

        <View style={rightColumnStyles}>
          <Text style={{ color: 'rgba(0,0,0,0.3)', letterSpacing: 0.02 }}>
            {format(trip.startDate, 'dd MMM yyyy', { locale: it })}
          </Text>
          <View style={remainingDaysContainerStyles}>
            <Text style={{ marginBottom: 1 }}>
              {t(TranslationsKeys.remainingDays)}
            </Text>
            <Text style={remainingDaysStyles}>
              {getRemainingDays(trip.startDate) +
                ' ' +
                (+getRemainingDays(trip.startDate) === 1
                  ? t(TranslationsKeys.day)
                  : t(TranslationsKeys.days))}
            </Text>
          </View>
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
  backgroundColor: 'white',
  borderRadius: 10,
  height: 78,
  padding: 12,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 10,
  width: '100%',
}

const gridStyles: ViewStyle = {
  flexDirection: 'column',
  gap: 5,
  justifyContent: 'space-between',
  alignItems: 'center',
  height: '100%',
}

const cityNameStyles: TextStyle = {
  color: 'rgba(0,0,0,0.6)',
  fontSize: 24,
  fontWeight: '800',
  textTransform: 'capitalize',
  width: 310,
}

const leftColumnStyles: ViewStyle = {
  width: '100%',
}

const destinationStyles: ViewStyle = {
  alignItems: 'center',
  columnGap: 10,
  display: 'flex',
  flexDirection: 'row',
}

const rightColumnStyles: ViewStyle = {
  alignItems: 'flex-end',
  flexDirection: 'row',
  justifyContent: 'space-between',
  padding: 0,
  width: '100%',
}

const remainingDaysContainerStyles: ViewStyle = {
  alignItems: 'flex-end',
  columnGap: 4,
  flexDirection: 'row',
}

const remainingDaysStyles: TextStyle = {
  color: 'tomato',
  fontSize: 18,
  fontWeight: '800',
}

export default TripCard
