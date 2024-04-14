import React from 'react'
import AddNewTrip from '../AddNewTrip/AddNewTrip'
import { SafeAreaView } from 'react-native'
import TripsList from '../TripsList/TripsList'

const Homepage = () => {
  return (
    <SafeAreaView style={{ flex: 1, padding: 10, gap: 20 }}>
      <AddNewTrip isFirstTrip={true} />
      <TripsList />
    </SafeAreaView>
  )
}

export default Homepage
