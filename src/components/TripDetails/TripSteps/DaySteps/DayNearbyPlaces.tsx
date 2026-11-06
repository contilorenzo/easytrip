import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { StepType, TripStep } from '../types'
import { fetchNearbyPlaces, formatDistance, NearbyPlace, NearbyType, placeKindLabel } from '../../../../services/nearbyPlaces'
import { openDirections } from '../../../../utils/navigation'

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

// Punto mediano tra le tappe del giorno (gli alloggi contano solo se non ci sono altre tappe con posizione)
export const dayCenter = (steps: TripStep<any>[]) => {
  const located = steps.filter((step) => step.extraData?.location?.coordinates)
  const preferred = located.filter((step) => step.type !== StepType.ACCOMODATION)
  const points = (preferred.length > 0 ? preferred : located).map((step) => step.extraData!.location!.coordinates)
  if (points.length === 0) return null
  return { lat: median(points.map((p) => p.lat)), lng: median(points.map((p) => p.lng)) }
}

// Pulsante nella colonna del giorno (a sinistra): apre la finestra dei consigli
export const DayNearbyButton = ({ open, onPress }: { open: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[buttonStyles.button, open && buttonStyles.buttonActive]}
    onPress={onPress}
    activeOpacity={0.75}
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    accessibilityLabel="Dove mangiare e dormire"
  >
    <Ionicons name="restaurant" size={14} color={open ? '#FFFFFF' : '#64748B'} />
    <Text style={[buttonStyles.label, open && buttonStyles.labelActive]}>Ristoranti{'\n'}e hotel</Text>
  </TouchableOpacity>
)

interface Props {
  steps: TripStep<any>[]
  open: boolean
  onClose: () => void
  // Titolo del giorno, es. "Mercoledì 21 ottobre"
  dayLabel: string
}

// Finestra con ristoranti e alloggi vicini al centro delle tappe del giorno
const DayNearbyPlaces = ({ steps, open, onClose, dayLabel }: Props) => {
  const insets = useSafeAreaInsets()
  const center = useMemo(() => dayCenter(steps), [steps])
  const [type, setType] = useState<NearbyType>('food')
  const [places, setPlaces] = useState<NearbyPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // La ricerca parte solo quando si apre la finestra
  useEffect(() => {
    if (!open || !center) return
    let active = true
    setLoading(true)
    setError('')
    setPlaces([])
    fetchNearbyPlaces(center.lat, center.lng, type)
      .then((result) => active && setPlaces(result))
      .catch((e) => active && setError(e?.message ?? 'Qualcosa è andato storto.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, type, center?.lat, center?.lng])

  if (!center) return null

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 0, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Dove mangiare e dormire</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close-circle" size={26} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {dayLabel} · vicino al centro delle tappe
        </Text>

        <View style={styles.tabs}>
          {([['food', 'Dove mangiare', 'restaurant-outline'], ['stay', 'Dove dormire', 'bed-outline']] as const).map(([id, label, icon]) => (
            <TouchableOpacity key={id} style={[styles.tab, type === id && styles.tabActive]} onPress={() => setType(id)} activeOpacity={0.8}>
              <Ionicons name={icon} size={16} color={type === id ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.tabText, type === id && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
          {loading && <ActivityIndicator color="#FF5A5F" style={{ marginTop: 24 }} />}
          {!!error && <Text style={styles.message}>{error}</Text>}
          {!loading && !error && places.length === 0 && <Text style={styles.message}>Nessun risultato in zona.</Text>}
          {places.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.row}
              onPress={() => openDirections({ name: place.name, address: place.name, coordinates: { lat: place.lat, lng: place.lng } })}
              activeOpacity={0.75}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={type === 'food' ? 'restaurant' : 'bed'} size={17} color="#FF5A5F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {place.name}
                </Text>
                <Text style={styles.meta}>
                  {placeKindLabel(place, type)}
                  {place.stars ? ` · ${place.stars}★` : ''}
                  {place.cuisine ? ` · ${place.cuisine}` : ''} · {formatDistance(place.distance)}
                </Text>
              </View>
              <Ionicons name="navigate-circle-outline" size={24} color="#94A3B8" />
            </TouchableOpacity>
          ))}
          <Text style={styles.credit}>Dati © OpenStreetMap contributors</Text>
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12.5, fontWeight: '600', color: '#64748B', marginBottom: 14, textTransform: 'capitalize' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: { flex: 1, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabActive: { backgroundColor: '#FF5A5F', borderColor: '#FF5A5F' },
  tabText: { fontSize: 13.5, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#EEF2F6' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14.5, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  message: { fontSize: 13.5, color: '#64748B', textAlign: 'center', marginTop: 24 },
  credit: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
})

const buttonStyles = StyleSheet.create({
  button: {
    marginTop: 8,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 2,
  },
  buttonActive: { backgroundColor: '#FF5A5F', borderColor: '#FF5A5F' },
  label: { fontSize: 8.5, fontWeight: '700', color: '#64748B', textAlign: 'center', lineHeight: 10 },
  labelActive: { color: '#FFFFFF' },
})

export default DayNearbyPlaces
