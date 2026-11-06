import React, { useMemo, useState } from 'react'
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AutocompleteDropdownItem } from 'react-native-autocomplete-dropdown'
import CountryFlag from '../common/CountryFlag/CountryFlag'
import { KeyboardAvoider, keyboardScrollProps } from '../common/KeyboardAvoider'
import { confirmAction } from '../../utils/confirm'
import { newVisitId, PastVisit } from '../../services/pastVisits'
import { formatPastVisit } from '../../utils/visitedCountries'

interface Props {
  visible: boolean
  onClose: () => void
  visits: PastVisit[]
  countries: AutocompleteDropdownItem[]
  onAdd: (visit: PastVisit) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Registra i paesi visitati prima di usare l'app: paese, anno e (facoltativo) mese
const PastVisitsModal = ({ visible, onClose, visits, countries, onAdd, onRemove }: Props) => {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState<AutocompleteDropdownItem | null>(null)
  const [year, setYear] = useState('')
  const [month, setMonth] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const currentYear = new Date().getFullYear()
  const yearNumber = Number(year)
  const yearValid = /^\d{4}$/.test(year) && yearNumber >= 1950 && yearNumber <= currentYear
  const canSave = !!country && yearValid && !saving

  const matches = useMemo(() => {
    const text = normalize(query.trim())
    if (!text || country) return []
    return countries.filter((item) => normalize(item.title ?? '').includes(text)).slice(0, 6)
  }, [query, country, countries])

  const handleSave = async () => {
    if (!country || !canSave) return
    setSaving(true)
    try {
      await onAdd({ id: newVisitId(), countryCode: String(country.id).toLowerCase(), countryName: country.title ?? '', year: yearNumber, month })
      setCountry(null)
      setQuery('')
      setYear('')
      setMonth(null)
    } catch (error: any) {
      Alert.alert('Non salvato', error?.message ?? 'Riprova tra poco.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = (visit: PastVisit) =>
    confirmAction({
      title: 'Rimuovere questo viaggio?',
      message: `${visit.countryName} · ${formatPastVisit(visit)}`,
      confirmText: 'Rimuovi',
      onConfirm: () => onRemove(visit.id).catch((e) => Alert.alert('Errore', e?.message ?? 'Riprova tra poco.')),
    })

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoider style={{ flex: 1 }}>
        <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 0, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Viaggi precedenti</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close-circle" size={26} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 24 }} {...keyboardScrollProps}>
            <Text style={styles.intro}>Indica i paesi in cui sei stato prima di usare l’app: compariranno sulla tua mappa.</Text>

            <View style={styles.card}>
              <Text style={styles.label}>PAESE</Text>
              {country ? (
                <TouchableOpacity style={styles.selected} onPress={() => setCountry(null)} activeOpacity={0.7}>
                  <CountryFlag countryCode={String(country.id)} height={18} resolution="w80" />
                  <Text style={styles.selectedText}>{country.title}</Text>
                  <Ionicons name="close" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : (
                <View style={styles.inputRow}>
                  <Ionicons name="search" size={17} color="#9CA3AF" />
                  <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Cerca un paese"
                    placeholderTextColor="#9CA3AF"
                    autoCorrect={false}
                  />
                </View>
              )}
              {matches.map((item) => (
                <TouchableOpacity
                  key={String(item.id)}
                  style={styles.match}
                  onPress={() => {
                    setCountry(item)
                    setQuery('')
                  }}
                  activeOpacity={0.7}
                >
                  <CountryFlag countryCode={String(item.id)} height={16} resolution="w80" />
                  <Text style={styles.matchText}>{item.title}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>ANNO</Text>
              <View style={styles.inputRow}>
                <Ionicons name="calendar-outline" size={17} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  value={year}
                  onChangeText={(text) => setYear(text.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder={`es. ${currentYear - 3}`}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <Text style={styles.label}>MESE (FACOLTATIVO)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {MONTHS.map((name, index) => {
                  const active = month === index + 1
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.monthChip, active && styles.monthChipActive]}
                      onPress={() => setMonth(active ? null : index + 1)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.monthText, active && styles.monthTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              <TouchableOpacity style={[styles.addButton, !canSave && styles.addButtonDisabled]} onPress={handleSave} disabled={!canSave} activeOpacity={0.85}>
                <Ionicons name="add-circle" size={19} color="#FFFFFF" />
                <Text style={styles.addText}>Aggiungi</Text>
              </TouchableOpacity>
            </View>

            {visits.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.label}>GIÀ REGISTRATI</Text>
                {visits.map((visit) => (
                  <View key={visit.id} style={styles.visitRow}>
                    <CountryFlag countryCode={visit.countryCode} height={18} resolution="w80" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitName}>{visit.countryName}</Text>
                      <Text style={styles.visitDate}>{formatPastVisit(visit)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemove(visit)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoider>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  intro: { fontSize: 13.5, color: '#64748B', lineHeight: 19 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, gap: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  label: { fontSize: 11.5, fontWeight: '800', color: '#6B7280', letterSpacing: 0.4, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', borderRadius: 14, paddingHorizontal: 12, minHeight: 46 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827', paddingVertical: 0 },
  selected: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF1F2', borderRadius: 14, paddingHorizontal: 12, minHeight: 46 },
  selectedText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  match: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 4 },
  matchText: { fontSize: 14.5, fontWeight: '600', color: '#1F2937' },
  monthChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F4F6' },
  monthChipActive: { backgroundColor: '#FF5A5F' },
  monthText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  monthTextActive: { color: '#FFFFFF' },
  addButton: { marginTop: 6, height: 48, borderRadius: 14, backgroundColor: '#FF5A5F', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonDisabled: { opacity: 0.4 },
  addText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  visitName: { fontSize: 14.5, fontWeight: '700', color: '#111827' },
  visitDate: { fontSize: 12.5, fontWeight: '600', color: '#94A3B8', marginTop: 1 },
})

export default PastVisitsModal
