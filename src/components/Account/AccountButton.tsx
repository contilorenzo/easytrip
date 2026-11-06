import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { ROUTES } from '../common/db/routes'
import { useAccountContext } from '../../state/AccountContext'
import UserAvatar from './UserAvatar'
import GlassButton from '../common/GlassButton'

// Pulsante tondo nell'angolo della home: apre account e sincronizzazione e mostra lo stato di sync con un piccolo badge
const AccountButton = () => {
  const { user, syncStatus, hasPendingChanges } = useAccountContext()

  const renderBadge = () => {
    if (!user) return null
    if (syncStatus === 'syncing') {
      return (
        <View style={[styles.badge, styles.badgeNeutral]}>
          <ActivityIndicator size={8} color="#FF5A5F" />
        </View>
      )
    }
    if (syncStatus === 'error') {
      return (
        <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
          <Ionicons name="alert" size={9} color="white" />
        </View>
      )
    }
    if (hasPendingChanges) {
      return (
        <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
          <Ionicons name="arrow-up" size={9} color="white" />
        </View>
      )
    }
    if (syncStatus === 'synced') {
      return (
        <View style={[styles.badge, { backgroundColor: '#22C55E' }]}>
          <Ionicons name="checkmark" size={9} color="white" />
        </View>
      )
    }
    return null
  }

  return (
    <View style={styles.wrapper}>
      <GlassButton onPress={() => router.push(ROUTES.SETTINGS)} accessibilityLabel="Account e sincronizzazione">
        {user ? (
          <UserAvatar user={user} size={36} backgroundColor="transparent" />
        ) : (
          <Ionicons name="person-outline" size={19} color="white" />
        )}
      </GlassButton>
      {renderBadge()}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { width: 38, height: 38 },

  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNeutral: {
    backgroundColor: 'white',
  },
})

export default AccountButton
