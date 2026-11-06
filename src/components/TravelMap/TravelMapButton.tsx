import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { ROUTES } from '../common/db/routes'
import GlassButton from '../common/GlassButton'

// Pulsante tondo nell'angolo della home (speculare a quello dell'account): apre la mappa dei paesi visitati
const TravelMapButton = () => (
  <GlassButton onPress={() => router.push(ROUTES.TRAVEL_MAP)} accessibilityLabel="Mappa dei paesi visitati">
    <Ionicons name="earth" size={20} color="white" />
  </GlassButton>
)

export default TravelMapButton
