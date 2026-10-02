import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateRangeField from '../AddNewTrip/DateRangeField'
import { Trip } from '../TripsList/types'
import { previewTripDatesChange } from '../../utils/tripDates'
import { updateTripDates } from '../common/db/utils'
import { useTripsContext } from '../../state/TripsContext'
import { confirmAction } from '../../utils/confirm'

interface Props {
  visible: boolean
  trip: Trip
  onClose: () => void
  // Chiamata dopo il salvataggio (per esempio per tornare a "Tutte le tappe")
  onSaved?: () => void
}

const EditTripDatesModal = ({ visible, trip, onClose, onSaved }: Props) => {
  const insets = useSafeAreaInsets()
  const context = useTripsContext()
  const [start, setStart] = useState(new Date(trip.startDate))
  const [end, setEnd] = useState(new Date(trip.endDate))
  const [isSaving, setIsSaving] = useState(false)

  // Ogni volta che si apre riparto dalle date attuali del viaggio
  useEffect(() => {
    if (visible) {
      setStart(new Date(trip.startDate))
      setEnd(new Date(trip.endDate))
    }
  }, [visible])

  const change = useMemo(
    () => previewTripDatesChange(trip.steps, new Date(trip.startDate), start, end),
    [trip.steps, trip.startDate, start, end]
  )

  const hasChanges = !isSameDay(start, new Date(trip.startDate)) || !isSameDay(end, new Date(trip.endDate))
  const { shiftDays, keptSteps, removedSteps } = change

  const save = async () => {
    setIsSaving(true)
    try {
      await updateTripDates(trip, start, end, context)
      onSaved?.()
      onClose()
    } catch (error) {
      console.error('Errore nel cambio delle date:', error)
      Alert.alert('Salvataggio non riuscito', 'Non sono riuscito a cambiare le date, riprova.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = () => {
    if (removedSteps.length === 0) {
      save()
      return
    }

    // Alcune tappe non ci stanno nel nuovo periodo: chiedo conferma elencandole
    const listed = removedSteps
      .slice(0, 5)
      .map((step) => `• ${step.title} (${format(new Date(step.startDateTime), 'd MMM', { locale: it })})`)
      .join('\n')
    const more = removedSteps.length > 5 ? `\n… e altre ${removedSteps.length - 5}` : ''

    confirmAction({
      title: removedSteps.length === 1 ? 'Eliminare 1 tappa?' : `Eliminare ${removedSteps.length} tappe?`,
      message: `Il nuovo periodo è più corto e queste tappe degli ultimi giorni non ci stanno:\n\n${listed}${more}`,
      confirmText: 'Elimina e salva',
      onConfirm: save,
    })
  }

  const shiftText =
    shiftDays === 0
      ? 'Le tappe restano ai loro giorni.'
      : `Le tappe si spostano di ${Math.abs(shiftDays)} ${Math.abs(shiftDays) === 1 ? 'giorno' : 'giorni'} ${shiftDays > 0 ? 'più avanti' : 'indietro'}.`

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* Su Android la finestra occupa tutto lo schermo, barra di stato compresa: serve il margine in alto */}
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 0, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Modifica date del viaggio</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close-circle" size={26} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          <View style={styles.card}>
            <DateRangeField
              alwaysOpen
              start={start}
              end={end}
              onChange={(newStart, newEnd) => {
                setStart(newStart)
                setEnd(newEnd)
              }}
            />
          </View>

          {hasChanges && (
            <View style={styles.card}>
              <View style={styles.impactRow}>
                <Ionicons name="swap-horizontal" size={17} color="#0284C7" />
                <Text style={styles.impactText}>{shiftText}</Text>
              </View>
              <View style={styles.impactRow}>
                <Ionicons name="checkmark-circle" size={17} color="#22C55E" />
                <Text style={styles.impactText}>
                  {keptSteps.length} {keptSteps.length === 1 ? 'tappa resta' : 'tappe restano'} nel viaggio.
                </Text>
              </View>
              {removedSteps.length > 0 && (
                <View style={styles.warningBox}>
                  <View style={styles.impactRow}>
                    <Ionicons name="warning" size={17} color="#D97706" />
                    <Text style={styles.warningTitle}>
                      {removedSteps.length === 1
                        ? '1 tappa non ci sta più e verrà eliminata:'
                        : `${removedSteps.length} tappe non ci stanno più e verranno eliminate:`}
                    </Text>
                  </View>
                  {removedSteps.map((step, index) => (
                    <Text key={`${step.title}_${step.startDateTime}_${index}`} style={styles.warningItem}>
                      • {step.title} — {format(new Date(step.startDateTime), 'd MMM', { locale: it })}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || isSaving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.saveText}>Salva date</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 24 },
  // Più margine in alto e ai lati: la finestra ha gli angoli molto arrotondati
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  impactText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#334155' },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  warningTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: '#92400E' },
  warningItem: { fontSize: 12.5, color: '#78350F', paddingLeft: 25 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'tomato',
  },
  saveButtonDisabled: { backgroundColor: '#CBD5E1' },
  saveText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '800' },
})

export default EditTripDatesModal
