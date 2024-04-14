import React from 'react'
import AddNewTrip from '../AddNewTrip/AddNewTrip'
import { SafeAreaView } from 'react-native'

const Homepage = () => {
  return (
    <SafeAreaView style={{ flex: 1, padding: 10 }}>
      <AddNewTrip isFirstTrip={true} />
    </SafeAreaView>
  )
}

export default Homepage
