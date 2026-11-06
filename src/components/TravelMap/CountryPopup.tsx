import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CountryFlag from '../common/CountryFlag/CountryFlag'
import { MapPalette } from './ScratchMap'
import { VisitEntry } from '../../utils/visitedCountries'

interface Props {
  code: string
  title: string
  status: 'visited' | 'upcoming' | null
  visits: VisitEntry[]
  palette: MapPalette
  onClose: () => void
}

// Scheda del paese toccato sulla mappa: bandiera, nome e date dei viaggi
const CountryPopup = ({ code, title, status, visits, palette, onClose }: Props) => {
  const color = status === 'visited' ? palette.visited : status === 'upcoming' ? palette.upcoming : '#9CA3AF'
  const statusLabel = status === 'visited' ? 'Visitato' : status === 'upcoming' ? 'In programma' : 'Non ancora visitato'

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CountryFlag countryCode={code} height={26} resolution="w80" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.status, { color }]}>{statusLabel}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {visits.length > 0 && (
        <View style={styles.visits}>
          {visits.map((visit, index) => (
            <View key={`${visit.label}-${index}`} style={styles.visitRow}>
              <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
              <Text style={styles.visitText}>{visit.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(24, 24, 28, 0.96)',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#F9FAFB' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { fontSize: 12, fontWeight: '700' },
  visits: { gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)', paddingTop: 10 },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visitText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#E5E7EB' },
})

export default CountryPopup
