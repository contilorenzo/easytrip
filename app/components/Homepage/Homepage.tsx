import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../../views/Homepage/HomeScreen'
import NewTripScreen from '../../views/Homepage/NewTripScreen'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import TripDetailsScreen from '../../views/TripDetails/TripDetailsScreen'

const Tab = createNativeStackNavigator()

const Homepage = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="New-trip"
        component={NewTripScreen}
        options={{ title: t(TranslationsKeys.trip_newTripPageTitle) }}
      />
      <Tab.Screen name="Details" component={TripDetailsScreen} />
    </Tab.Navigator>
  )
}

export default Homepage
