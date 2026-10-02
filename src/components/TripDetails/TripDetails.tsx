import React, { useCallback, useRef, useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
  Modal,
  Platform,
} from 'react-native'
import { format, eachDayOfInterval, interval } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'
import TripSteps from './TripSteps/TripSteps'
import { useTripsContext } from '../../state/TripsContext'
import CountryFlag from '../common/CountryFlag/CountryFlag'
import { useFocusEffect, router } from 'expo-router'
import { it } from 'date-fns/locale'
import TripMap from './TripMap/TripMap'
import EditTripDatesModal from './EditTripDatesModal'
import { canEdit, isOwner, isShared } from '../../utils/tripRole'
import ShareTripModal from './ShareTripModal'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const DAY_COLORS = [
  '#FF6B6B', // Giorno 1: Corallo
  '#14B8A6', // Giorno 2: Turchese / Menta
  '#2563EB', // Giorno 3: Blu Reale (stacco netto e chiarissimo!)
  '#9333EA', // Giorno 4: Viola
  '#F59E0B', // Giorno 5: Arancio ambra
  '#EC4899', // Giorno 6: Rosa acceso
  '#0891B2', // Giorno 7: Ciano profondo
  '#4F46E5', // Giorno 8: Indaco
]

const TripDetails = () => {
  const insets = useSafeAreaInsets()
  const trip = useTripsContext().currentTrip

  const [selectedStep, setSelectedStep] = useState<any>(null)
  const [selectedDay, setSelectedDay] = useState<string | 'ALL'>('ALL')
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isEditDatesOpen, setIsEditDatesOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false)

  const tripDays = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return []
    return eachDayOfInterval(interval(new Date(trip.startDate), new Date(trip.endDate))).map(d =>
      format(d, 'yyyy-MM-dd')
    )
  }, [trip?.startDate, trip?.endDate])

  const dayOptions = useMemo(() => {
    return ['ALL', ...tripDays]
  }, [tripDays])

  const selectedDayIndex = Math.max(0, dayOptions.indexOf(selectedDay))
  const dayIndex = tripDays.indexOf(selectedDay)

  const handlePrevDay = () => {
    if (selectedDayIndex > 0) {
      handleDaySelect(dayOptions[selectedDayIndex - 1])
    }
  }

  const handleNextDay = () => {
    if (selectedDayIndex < dayOptions.length - 1) {
      handleDaySelect(dayOptions[selectedDayIndex + 1])
    }
  }

  const handleDaySelect = (day: string | 'ALL') => {
    setSelectedDay(day)
    if (selectedStep && day !== 'ALL') {
      const stepDay = format(new Date(selectedStep.startDateTime), 'yyyy-MM-dd')
      if (stepDay !== day) {
        setSelectedStep(null)
      }
    }
  }

  const scrollY = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef<any>(null)
  const stepPositions = useRef<{ [key: string]: number }>({})
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMapTouchChange = (isTouching: boolean) => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current)
      touchTimeoutRef.current = null
    }
    setScrollEnabled(!isTouching)
    if (isTouching) {
      // Safety timeout: automatically re-enable scroll after 4s in case of unhandled touch release
      touchTimeoutRef.current = setTimeout(() => {
        setScrollEnabled(true)
      }, 4000)
    }
  }

  const handleStepSelection = (step: any, day?: string, source: 'map' | 'list' = 'list') => {
    const effectiveDay = day || (selectedDay !== 'ALL' ? selectedDay : format(new Date(step.startDateTime), 'yyyy-MM-dd'))
    setSelectedStep({
      ...step,
      targetDay: effectiveDay,
      source,
    })

    if (source === 'map' && step) {
      const stepKey = `${effectiveDay}_${step.title}_${step.startDateTime}`
      // Scorrimento istantaneo e una volta sola: un'animazione di scorrimento in contemporanea a quella della mappa
      // (e ripetuta dopo 100 ms) faceva scattare la mappa verso la fine del suo movimento
      const scrollToStep = (): boolean => {
        let yPos = stepPositions.current[stepKey]
        if (yPos === undefined) {
          const fallbackKey = Object.keys(stepPositions.current).find(k => k.includes(`${step.title}_${step.startDateTime}`))
          if (fallbackKey) yPos = stepPositions.current[fallbackKey]
        }
        if (yPos === undefined) return false
        scrollViewRef.current?.scrollTo({ y: Math.max(0, yPos - 12), animated: false })
        return true
      }

      // Se la posizione della tappa non è ancora stata misurata riprovo una sola volta
      if (!scrollToStep()) setTimeout(scrollToStep, 100)
    }
  }

  // Se il viaggio non c'è più (eliminato, lasciato o tolto dall'account) torno indietro, una volta sola.
  // La funzione deve essere stabile: senza useCallback il controllo si ripeteva a ogni ridisegno e chiamava "indietro"
  // più volte, fino a quando non restava nessuna schermata a cui tornare (errore GO_BACK e chiusura dell'app).
  const hasTrip = !!trip?.id
  useFocusEffect(
    useCallback(() => {
      if (hasTrip) return
      if (router.canGoBack()) router.back()
      else router.replace('/')
    }, [hasTrip])
  )

  if (!trip) return null

  const startDate = new Date(trip.startDate)
  const endDate = new Date(trip.endDate)

  return (
    <View style={styles.container}>
      {/* Header: City, Country, Dates */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.cityText}>{trip.city.toUpperCase()}</Text>
          <View style={styles.countryChip}>
            <CountryFlag countryCode={trip.country.id} height={16} isCircle />
            <Text style={styles.countryText}>{trip.country?.title}</Text>
          </View>
        </View>

        <View style={styles.headerActionsRow}>
          <TouchableOpacity
            style={styles.datesChip}
            onPress={() => canEdit(trip) && setIsEditDatesOpen(true)}
            activeOpacity={canEdit(trip) ? 0.8 : 1}
          >
            <Ionicons name="calendar-outline" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.dateText}>
              {format(startDate, 'd MMM', { locale: it })}
            </Text>
            <Ionicons name="arrow-forward" size={12} color="rgba(255, 255, 255, 0.75)" style={{ marginHorizontal: 7 }} />
            <Text style={styles.dateText}>
              {format(endDate, 'd MMM', { locale: it })}
            </Text>
            {canEdit(trip) && (
              <Ionicons name="pencil" size={11} color="rgba(255, 255, 255, 0.85)" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>

          {/* Condivisione: il proprietario invita, gli altri vedono il proprio ruolo */}
          {isOwner(trip) ? (
            <TouchableOpacity style={styles.sharePill} onPress={() => setIsShareOpen(true)} activeOpacity={0.85}>
              <Ionicons name="people" size={14} color="#1E293B" />
              <Text style={styles.sharePillText}>Condividi</Text>
            </TouchableOpacity>
          ) : isShared(trip) ? (
            <>
              {/* Elenco dei partecipanti */}
              <TouchableOpacity style={styles.sharePill} onPress={() => setIsParticipantsOpen(true)} activeOpacity={0.85}>
                <Ionicons name="people" size={14} color="#1E293B" />
                <Text style={styles.sharePillText}>Partecipanti</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>

      {/* Map Container - always visible at the top */}
      <View style={styles.mapContainer}>
        <TripMap 
          steps={trip.steps || []} 
          selectedStep={selectedStep} 
          selectedDay={selectedDay} 
          setSelectedDay={setSelectedDay} 
          onStepPress={(step, day) => handleStepSelection(step, day, 'map')}
          onDeselectStep={() => setSelectedStep(null)}
          onMapTouchChange={handleMapTouchChange}
        />
      </View>

      {/* Separate Steps Section with white background that scrolls independently */}
      <View style={[styles.stepsSection, tripDays.length <= 1 && { paddingTop: 12 }]}>
        {/* Integrated Day Selector Bar following container border-radius & padding */}
        {tripDays.length > 1 && (
          <View style={styles.selectorBar}>
            <TouchableOpacity
              onPress={handlePrevDay}
              disabled={selectedDayIndex === 0}
              style={[
                styles.arrowButton,
                selectedDayIndex === 0 && styles.arrowButtonDisabled
              ]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={selectedDayIndex === 0 ? '#CBD5E1' : '#1E293B'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectorCenter}
              onPress={() => setIsPickerOpen(true)}
              activeOpacity={0.75}
            >
              {selectedDay === 'ALL' ? (
                <Ionicons name="layers-outline" size={15} color="#0284C7" style={{ marginRight: 6 }} />
              ) : (
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: DAY_COLORS[dayIndex % DAY_COLORS.length] }
                  ]}
                />
              )}
              <Text style={styles.selectorTitle} numberOfLines={1}>
                {selectedDay === 'ALL'
                  ? 'Tutte le tappe'
                  : `Giorno ${dayIndex + 1} • ${format(new Date(selectedDay), 'EEE d MMM', { locale: it })}`
                }
              </Text>
              <View style={styles.dayCounterBadge}>
                <Text style={styles.dayCounterText}>
                  {selectedDay === 'ALL' ? `${tripDays.length} gg` : `${dayIndex + 1}/${tripDays.length}`}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={12} color="#94A3B8" style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNextDay}
              disabled={selectedDayIndex === dayOptions.length - 1}
              style={[
                styles.arrowButton,
                selectedDayIndex === dayOptions.length - 1 && styles.arrowButtonDisabled
              ]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={selectedDayIndex === dayOptions.length - 1 ? '#CBD5E1' : '#1E293B'}
              />
            </TouchableOpacity>
          </View>
        )}

        <Animated.ScrollView
          ref={scrollViewRef}
          style={styles.stepsScrollView}
          contentContainerStyle={[
            styles.stepsScrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 24 }
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Toccando lo spazio vuoto tra e sotto le tappe si deseleziona quella corrente */}
          <Pressable style={styles.deselectArea} onPress={() => setSelectedStep(null)}>
            <TripSteps 
              steps={trip.steps || []} 
              onStepPress={(step, day) => handleStepSelection(step, day, 'list')} 
              selectedDay={selectedDay} 
              selectedStep={selectedStep} 
              scrollY={scrollY}
              onStepLayout={(step, day, y) => {
                const stepKey = `${day}_${step.title}_${step.startDateTime}`
                stepPositions.current[stepKey] = y
              }}
            />
          </Pressable>
        </Animated.ScrollView>
      </View>

      <ShareTripModal visible={isShareOpen} trip={trip} onClose={() => setIsShareOpen(false)} />
      <ShareTripModal readOnly visible={isParticipantsOpen} trip={trip} onClose={() => setIsParticipantsOpen(false)} />

      {/* Modifica delle date del viaggio */}
      <EditTripDatesModal
        visible={isEditDatesOpen}
        trip={trip}
        onClose={() => setIsEditDatesOpen(false)}
        onSaved={() => {
          // Il giorno selezionato potrebbe non esistere più nel nuovo periodo
          setSelectedDay('ALL')
          setSelectedStep(null)
        }}
      />

      {/* Day Picker Modal */}
      <Modal
        visible={isPickerOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsPickerOpen(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Giorno</Text>
              <TouchableOpacity
                onPress={() => setIsPickerOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  selectedDay === 'ALL' && styles.modalOptionActive
                ]}
                onPress={() => {
                  handleDaySelect('ALL')
                  setIsPickerOpen(false)
                }}
              >
                <View style={styles.modalOptionLeft}>
                  <View style={[styles.modalOptionIcon, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="layers" size={16} color="#0284C7" />
                  </View>
                  <View>
                    <Text style={styles.modalOptionText}>Tutte le tappe</Text>
                    <Text style={styles.modalOptionSubtext}>Mostra tutti i {tripDays.length} giorni</Text>
                  </View>
                </View>
                {selectedDay === 'ALL' && (
                  <Ionicons name="checkmark-circle" size={20} color="#0284C7" />
                )}
              </TouchableOpacity>

              {tripDays.map((dayStr, idx) => {
                const isSelected = selectedDay === dayStr
                const dayColor = DAY_COLORS[idx % DAY_COLORS.length]
                const formatted = format(new Date(dayStr), 'EEEE d MMMM', { locale: it })
                const dayStepsCount = (trip.steps || []).filter((s: any) => {
                  const sDay = format(new Date(s.startDateTime), 'yyyy-MM-dd')
                  return sDay === dayStr
                }).length

                return (
                  <TouchableOpacity
                    key={dayStr}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionActive
                    ]}
                    onPress={() => {
                      handleDaySelect(dayStr)
                      setIsPickerOpen(false)
                    }}
                  >
                    <View style={styles.modalOptionLeft}>
                      <View style={[styles.modalOptionColorDot, { backgroundColor: dayColor }]} />
                      <View>
                        <Text style={styles.modalOptionText}>
                          Giorno {idx + 1}
                        </Text>
                        <Text style={styles.modalOptionSubtext}>
                          {formatted} • {dayStepsCount} {dayStepsCount === 1 ? 'tappa' : 'tappe'}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={dayColor} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Prima riga (titolo) alla stessa altezza dei pulsanti tondi in alto (42 px) e con ai lati lo spazio per loro;
  // seconda riga (date e condivisione) sotto di essi: i due gruppi non si sovrappongono mai
  headerContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'android' ? 10 : 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    // Con flexWrap le righe si impilano in alto: alignContent le centra nell'altezza dei pulsanti
    alignContent: 'center',
    minHeight: 42,
    paddingHorizontal: 46,
    columnGap: 7,
    rowGap: 3,
  },
  cityText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  countryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    maxWidth: '100%',
  },
  sharePill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sharePillText: { fontSize: 12, fontWeight: '800', color: '#1E293B' },
  // Icona tonda del proprio ruolo (matita = può modificare, occhio = solo lettura)
  roleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  datesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    flexShrink: 1,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mapContainer: {
    width: '100%',
    paddingHorizontal: 8,
    zIndex: 10,
  },
  stepsSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: Platform.OS === 'android' ? 6 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  selectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonDisabled: {
    opacity: 0.35,
  },
  selectorCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '75%',
  },
  colorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  selectorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  dayCounterBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginLeft: 6,
  },
  dayCounterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  stepsScrollView: {
    flex: 1,
    width: '100%',
  },
  stepsScrollContent: {
    paddingHorizontal: 8,
    paddingTop: 6,
    // Il contenuto riempie lo spazio sotto l'ultima tappa: anche toccando lì si deseleziona
    flexGrow: 1,
  },
  deselectArea: {
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    maxHeight: '65%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalScrollView: {
    maxHeight: 320,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  modalOptionActive: {
    backgroundColor: '#F8FAFC',
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textTransform: 'capitalize',
  },
})

export default TripDetails
