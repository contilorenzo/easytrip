import React, { useEffect, useState } from 'react'
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { setFlightsEnabled } from '../../services/flightSuggestions'
import { useFlightSettings } from './useFlightSuggestion'
import { getTipsEnabled, loadTipsSettings, setTipsEnabled, subscribeTips } from '../../services/travelTips'
import OriginPickerModal from './OriginPickerModal'

// Impostazioni dei suggerimenti voli: attivazione e aeroporto di partenza
const FlightSettingsCard = () => {
  const { enabled, origin } = useFlightSettings()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tipsOn, setTipsOn] = useState(getTipsEnabled())
  useEffect(() => {
    loadTipsSettings().then(() => setTipsOn(getTipsEnabled()))
    return subscribeTips(() => setTipsOn(getTipsEnabled()))
  }, [])

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="airplane-outline" size={18} color="#0284C7" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Suggerimenti voli</Text>
          <Text style={styles.subtitle}>Prezzi indicativi dei voli per i tuoi viaggi, con link di affiliazione</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setFlightsEnabled}
          trackColor={{ true: '#FF5A5F', false: '#CBD5E1' }}
          thumbColor="white"
          accessibilityLabel="Suggerimenti voli"
        />
      </View>
      {enabled && (
        <TouchableOpacity style={styles.originRow} onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel="Cambia la partenza dei voli">
          <Text style={styles.originLabel}>Partenza</Text>
          <Text style={styles.originValue} numberOfLines={1}>
            {origin ? `${origin.cityName} (${origin.code})` : 'Da scegliere'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </TouchableOpacity>
      )}
      <View style={[styles.row, styles.tipsRow]}>
        <Ionicons name="compass-outline" size={18} color="#0284C7" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Consigli di viaggio</Text>
          <Text style={styles.subtitle}>Esperienze, bagagli, auto, transfer ed eSIM, con link di affiliazione</Text>
        </View>
        <Switch value={tipsOn} onValueChange={setTipsEnabled} trackColor={{ true: '#FF5A5F', false: '#CBD5E1' }} thumbColor="white" accessibilityLabel="Consigli di viaggio" />
      </View>
      <OriginPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 14.5, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 1 },
  tipsRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', paddingTop: 12 },
  originRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', paddingTop: 12 },
  originLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  originValue: { flex: 1, textAlign: 'right', fontSize: 13.5, fontWeight: '700', color: '#111827' },
})

export default FlightSettingsCard
