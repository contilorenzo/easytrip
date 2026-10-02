import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import TripDetails from '../src/components/TripDetails/TripDetails'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTripsContext } from '../src/state/TripsContext'
import { removeTrip } from '../src/components/common/db/utils'
import { confirmAction } from '../src/utils/confirm'
import { isOwner } from '../src/utils/tripRole'
import { leaveTrip } from '../src/components/common/db/utils'
import { useAccountContext } from '../src/state/AccountContext'
import ThemeBackground from '../src/components/common/ThemeBackground'
import { useFlagTheme } from '../src/utils/countryTheme'

const TripDetailsScreen = () => {
  const context = useTripsContext()
  const insets = useSafeAreaInsets()
  const countryTheme = useFlagTheme(context.currentTrip?.country?.id)
  const { user } = useAccountContext()
  const owner = isOwner(context.currentTrip)

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Full-screen Flag Gradient Background */}
      <ThemeBackground
        countryCode={context.currentTrip?.country?.id}
        colors={countryTheme.gradient}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Header Buttons */}
      <View
        style={[
          styles.floatingHeader,
          { top: Math.max(insets.top, 16) + 4 }
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.replace('/')
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.rightButtons}>
          {owner ? (
            <>
            <TouchableOpacity
              style={styles.floatingButton}
              onPress={() => {
                if (!context.currentTrip?.id) return
                confirmAction({
                  title: 'Elimina viaggio',
                  message: `Sei sicuro di voler eliminare il viaggio a ${context.currentTrip.city}?`,
                  onConfirm: async () => {
                    if (context.currentTrip?.id) {
                      await removeTrip(context.currentTrip.id, context)
                    }
                  },
                })
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            </>
          ) : (
            /* Viaggio condiviso da altri: non si elimina, si lascia */
            <TouchableOpacity
              style={styles.floatingButton}
              onPress={() => {
                const trip = context.currentTrip
                if (!trip || !user) return
                confirmAction({
                  title: 'Lasciare il viaggio?',
                  message: `Il viaggio a ${trip.city} sparirà dal tuo telefono. Per l'organizzatore e gli altri resta com'è.`,
                  confirmText: 'Lascia',
                  onConfirm: () => leaveTrip(trip, user.id, context),
                })
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={21} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TripDetails />

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 999,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  floatingButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    // Semitrasparenti, come i pulsanti delle pagine "Nuovo viaggio" e "Modifica tappa"
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
})

export default TripDetailsScreen
