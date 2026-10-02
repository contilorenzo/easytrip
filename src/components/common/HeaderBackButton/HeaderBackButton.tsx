import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

interface Props {
  fallbackRoute?: 'home' | 'trip-details'
}

export const HeaderBackButton = ({ fallbackRoute = 'home' }: Props) => {
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back()
    } else if (fallbackRoute === 'trip-details') {
      router.replace('/trip-details')
    } else {
      router.replace('/')
    }
  }

  return (
    <TouchableOpacity onPress={handlePress}>
      <Ionicons
        name="chevron-back"
        size={20}
        color="#000"
      />
    </TouchableOpacity>
  )
}

export default HeaderBackButton
