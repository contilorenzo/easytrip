import React from 'react'
import { Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ROUTES } from '../common/db/routes'
import { router } from 'expo-router'

interface Props {
  isFirstTrip: boolean
}

const AddNewTripButton = ({ isFirstTrip }: Props) => {
  const handlePress = () => router.push(ROUTES.NEW_TRIP)

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.leftContent}>
        <View style={styles.iconCircle}>
          <Ionicons name="airplane" size={20} color="tomato" />
        </View>
        <View style={styles.textWrapper}>
          <Text style={styles.title}>
            {isFirstTrip ? 'Crea il tuo primo viaggio' : 'Nuovo viaggio'}
          </Text>
          <Text style={styles.subtitle}>
            {isFirstTrip ? 'Inizia ad organizzare la tua avventura' : 'Aggiungi una nuova destinazione'}
          </Text>
        </View>
      </View>

      <View style={styles.plusCircle}>
        <Ionicons name="add" size={22} color="white" />
      </View>
    </TouchableOpacity>
  )
}

// Su Android riduco leggermente testi e spazi verticali
const fs = (size: number) => (Platform.OS === 'android' ? Math.round(size * 0.9 * 2) / 2 : size)
const vs = (size: number) => (Platform.OS === 'android' ? Math.round(size * 0.8) : size)

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: vs(14),
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    width: '100%',
    marginBottom: 10,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: fs(16),
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: fs(12),
    fontWeight: '500',
    marginTop: 1,
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'tomato',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'tomato',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
})

export default AddNewTripButton
