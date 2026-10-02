import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CalendarStay, getCalendarEvents } from '../../../../services/calendarImport'

interface Props {
  visible: boolean
  rangeStart: Date
  rangeEnd: Date
  onClose: () => void
  onSelect: (stay: CalendarStay) => void
}

type State = 'loading' | 'denied' | 'ready' | 'error'

const CalendarImportModal = ({ visible, rangeStart, rangeEnd, onClose, onSelect }: Props) => {
  const insets = useSafeAreaInsets()
  const [state, setState] = useState<State>('loading')
  const [events, setEvents] = useState<CalendarStay[]>([])
  const [onlyStays, setOnlyStays] = useState(true)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setState('loading')
    getCalendarEvents(rangeStart, rangeEnd)
      .then((result) => {
        if (cancelled) return
        if (result.status === 'denied') {
          setState('denied')
          return
        }
        setEvents(result.events)
        // Se non c'è nessun evento che somigli a una prenotazione mostro subito tutti gli eventi
        setOnlyStays(result.events.some((e) => e.likelyStay))
        setState('ready')
      })
      .catch(() => !cancelled && setState('error'))
    return () => {
      cancelled = true
    }
  }, [visible])

  const shown = useMemo(() => (onlyStays ? events.filter((e) => e.likelyStay) : events), [events, onlyStays])

  const formatRange = (e: CalendarStay) => {
    const sameYear = e.start.getFullYear() === e.end.getFullYear()
    return `${format(e.start, 'd MMM', { locale: it })} → ${format(e.end, sameYear ? 'd MMM yyyy' : 'd MMM yyyy', { locale: it })}`
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* Su Android la finestra occupa tutto lo schermo, barra di stato compresa: serve il margine in alto */}
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 0, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Importa dal calendario</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close-circle" size={26} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {state === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color="#FF5A5F" />
          </View>
        )}

        {state === 'denied' && (
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={36} color="#CBD5E1" />
            <Text style={styles.message}>Per importare le prenotazioni serve l’accesso al calendario.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Apri le impostazioni</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'error' && (
          <View style={styles.center}>
            <Text style={styles.message}>Non riesco a leggere il calendario. Riprova.</Text>
          </View>
        )}

        {state === 'ready' && (
          <>
            <View style={styles.segment}>
              <TouchableOpacity
                style={[styles.segmentItem, onlyStays && styles.segmentItemActive]}
                onPress={() => setOnlyStays(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, onlyStays && styles.segmentTextActive]}>Possibili alloggi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentItem, !onlyStays && styles.segmentItemActive]}
                onPress={() => setOnlyStays(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, !onlyStays && styles.segmentTextActive]}>Tutti gli eventi</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Eventi dal {format(rangeStart, 'd MMM', { locale: it })} al {format(rangeEnd, 'd MMM', { locale: it })}
            </Text>

            <FlatList
              data={shown}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 16, gap: 8 }}
              ListEmptyComponent={
                <Text style={[styles.message, { marginTop: 40 }]}>Nessun evento trovato nel periodo del viaggio.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => onSelect(item)} activeOpacity={0.8}>
                  <View style={styles.rowIcon}>
                    <Ionicons name={item.likelyStay ? 'bed' : 'calendar'} size={18} color={item.likelyStay ? '#FF5A5F' : '#64748B'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {item.title || 'Evento senza titolo'}
                    </Text>
                    <Text style={styles.rowMeta}>{formatRange(item)}</Text>
                    {!!item.location && (
                      <Text style={styles.rowLocation} numberOfLines={1}>
                        {item.location}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 24 },
  // Più margine in alto e ai lati: la finestra ha gli angoli molto arrotondati
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 20 },
  message: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  primaryButton: { backgroundColor: '#FF5A5F', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14 },
  primaryButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },
  segment: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  segmentItemActive: { backgroundColor: '#FFFFFF' },
  segmentText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  segmentTextActive: { color: '#111827' },
  hint: { fontSize: 12, color: '#94A3B8', marginVertical: 10, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  rowMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  rowLocation: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
})

export default CalendarImportModal
