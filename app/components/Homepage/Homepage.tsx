import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../../views/Homepage/HomeScreen'
import NewTripScreen from '../../views/Homepage/NewTripScreen'

const Tab = createNativeStackNavigator()

const Homepage = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="New-trip" component={NewTripScreen} />
    </Tab.Navigator>
  )
}

export default Homepage
