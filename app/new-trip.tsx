import React from 'react'
import { View, StyleSheet } from 'react-native'
import NewTripForm from '../src/components/AddNewTrip/NewTripForm'
import NativeNavHeader from '../src/components/common/NativeNavHeader'

const NewTripScreen = () => {
  return (
    <View style={styles.screen}>
      {/* L'intestazione è disegnata dal form (hero con gradiente) */}
      <NativeNavHeader />
      <NewTripForm />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
})

export default NewTripScreen
