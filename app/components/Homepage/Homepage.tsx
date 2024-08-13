import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../../views/Homepage/HomeScreen'
import NewTripScreen from '../../views/Homepage/NewTripScreen'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import TripDetailsScreen from '../../views/TripDetails/TripDetailsScreen'
import AddStepScreen from '../../views/TripDetails/AddStepScreen'
import { ROUTES } from '../common/db/routes'

const Tab = createNativeStackNavigator()

const Homepage = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name={ROUTES.NEW_TRIP}
        component={NewTripScreen}
        options={{ title: t(TranslationsKeys.trip_newTripPageTitle) }}
      />
      <Tab.Screen
        name={ROUTES.TRIP_DETAILS}
        component={TripDetailsScreen}
        options={{ title: t(TranslationsKeys.trip_tripDetails) }}
      />
      <Tab.Screen
        name={ROUTES.ADD_STEP}
        component={AddStepScreen}
        options={{ title: t(TranslationsKeys.trip_addStep) }}
      />
    </Tab.Navigator>
  )
}

export default Homepage
