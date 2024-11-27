import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../../views/Homepage/HomeScreen'
import NewTripScreen from '../../views/Homepage/NewTripScreen'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import TripDetailsScreen from '../../views/TripDetails/TripDetailsScreen'
import AddStepScreen from '../../views/TripDetails/AddStepScreen'
import { ROUTES } from '../common/db/routes'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTripsContext } from '../../state/TripsContext'
import { removeTrip } from '../common/db/utils'
import UpdateStepScreen from '../../views/TripDetails/UpdateStepScreen'

const Tab = createNativeStackNavigator()

const Homepage = () => {
  const context = useTripsContext()
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t(TranslationsKeys.appName) }}
      />
      <Tab.Screen
        name={ROUTES.NEW_TRIP}
        component={NewTripScreen}
        options={{ title: t(TranslationsKeys.trip_newTripPageTitle) }}
      />
      <Tab.Screen
        name={ROUTES.TRIP_DETAILS}
        component={TripDetailsScreen}
        options={{
          title: t(TranslationsKeys.trip_tripDetails),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => removeTrip(context.currentTrip.id, context)}
            >
              <Ionicons name="trash-outline" size={20} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.ADD_STEP}
        component={AddStepScreen}
        options={{ title: t(TranslationsKeys.trip_addStep) }}
      />
      <Tab.Screen
        name={ROUTES.UPDATE_STEP}
        component={UpdateStepScreen}
        options={{ title: t(TranslationsKeys.trip_updateStep) }}
      />
    </Tab.Navigator>
  )
}

export default Homepage
