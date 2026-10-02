import {
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { StepType, TripStep, VEHICLES, Location } from '../types'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CountryFlag from '../../../common/CountryFlag/CountryFlag'
import { t } from '../../../../translations'
import { TranslationsKeys } from '../../../../translations/types'
import TextField from '../../../FormElements/TextField'
import DateTimeField from '../../../FormElements/DateTimeField'
import { useEffect, useState } from 'react'
import { addHours, addMinutes, isAfter, isSameDay, format } from 'date-fns'
import { it } from 'date-fns/locale'
import { router, useLocalSearchParams } from 'expo-router'
import RadioField from '../../../FormElements/RadioField'
import { useTripsContext } from '../../../../state/TripsContext'
import { getStepTypeIcon } from '../TripStep/StepTypes/DefaultStep'
import LocationField from './LocationField'
import CalendarImportModal from './CalendarImportModal'
import { KeyboardAvoider, keyboardScrollProps } from '../../../common/KeyboardAvoider'
import { CalendarStay } from '../../../../services/calendarImport'
import { geocodeStayAddress } from '../../../../services/geocoding'
import { addDays, subDays, startOfDay, setHours, setMinutes } from 'date-fns'

const StepForm = ({
  start,
  end,
  title,
  type,
  vehicle,
  location,
  mode = 'add',
  onDelete,
  onSubmit,
}: Props) => {
  const insets = useSafeAreaInsets()
  const trip = useTripsContext().currentTrip
  const params = useLocalSearchParams()

  const [startDateTime, setStartDateTime] = useState<Date>(start)
  const [endDateTime, setEndDateTime] = useState<Date>(end)
  const [_title, setTitle] = useState<string>(title ?? '')
  const [_type, setType] = useState<StepType>(type ?? StepType.VISIT)
  const [_vehicle, setVehicle] = useState<VEHICLES | undefined>(vehicle)
  const [_location, setLocation] = useState<Location | undefined>(location)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // La notte del giorno scelto: dalla sera fino alla mattina dopo, adattata alle tappe già presenti.
  // Una prenotazione di più notti non va importata su tutti i giorni, altrimenti si sovrappone alle altre attività.
  const getNightWindow = (day: Date) => {
    const steps = trip?.steps ?? []
    const nightStartDefault = setMinutes(setHours(startOfDay(day), 22), 0)
    const nextDay = addDays(startOfDay(day), 1)
    const nightEndDefault = setMinutes(setHours(nextDay, 8), 0)

    // Se una tappa del giorno finisce dopo le 22 la notte comincia da lì
    const sameDayEnds = steps
      .filter((step) => isSameDay(new Date(step.startDateTime), day))
      .map((step) => new Date(step.endDateTime).getTime())
    const latestEnd = sameDayEnds.length ? Math.max(...sameDayEnds) : 0
    const nightStart = new Date(Math.max(nightStartDefault.getTime(), Math.min(latestEnd, nextDay.getTime() - 60000)))

    // Se il giorno dopo c'è una tappa prima delle 8 la notte finisce lì
    const nextDayStarts = steps
      .filter((step) => isSameDay(new Date(step.startDateTime), nextDay))
      .map((step) => new Date(step.startDateTime).getTime())
    const earliestNext = nextDayStarts.length ? Math.min(...nextDayStarts) : Infinity
    let nightEnd = new Date(Math.min(nightEndDefault.getTime(), earliestNext))
    if (nightEnd.getTime() <= nightStart.getTime()) nightEnd = addHours(nightStart, 1)

    return { nightStart, nightEnd }
  }

  // Compila titolo, notte e posizione a partire da un evento del calendario (prenotazione)
  const importFromCalendar = async (stay: CalendarStay) => {
    setIsCalendarOpen(false)
    setTitle(stay.title)

    const { nightStart, nightEnd } = getNightWindow(start)
    setStartDateTime(nightStart)
    setEndDateTime(nightEnd)

    if (!stay.location) {
      Alert.alert('Indirizzo mancante', 'L’evento non ha un indirizzo: ho compilato titolo e orari, cerca l’indirizzo dell’alloggio qui sopra.')
      return
    }

    setIsImporting(true)
    const found = await geocodeStayAddress(
      stay.location,
      stay.title,
      trip?.city ?? '',
      trip?.country?.title ?? '',
      typeof trip?.country?.id === 'string' ? trip.country.id : undefined
    )
    setIsImporting(false)
    if (found) {
      setLocation(found)
    } else {
      Alert.alert('Indirizzo non trovato', 'Ho compilato titolo e orari. Cerca l’indirizzo dell’alloggio qui sopra.')
    }
  }

  const getOverlappingSteps = (): TripStep<any>[] => {
    if (!trip?.steps) return []
    return trip.steps.filter((step) => {
      // Ignore the step being edited itself if it matches title & original start
      if (title && step.title === title && new Date(step.startDateTime).getTime() === start.getTime()) return false
      
      const stepStart = new Date(step.startDateTime).getTime()
      const stepEnd = new Date(step.endDateTime).getTime()
      const newStart = startDateTime.getTime()
      const newEnd = endDateTime.getTime()
      
      return newStart < stepEnd && newEnd > stepStart
    })
  }

  const overlappingSteps = getOverlappingSteps()

  const isFormValid = () =>
    !!_location && !!_type && !!startDateTime && !!endDateTime && overlappingSteps.length === 0

  const formatStepTimeRange = (step: TripStep<any>) => {
    const s = new Date(step.startDateTime)
    const e = new Date(step.endDateTime)
    const isSameDayStep = isSameDay(s, e)

    if (isSameDayStep) {
      if (isSameDay(s, startDateTime)) {
        return `dalle ${format(s, 'HH:mm')} alle ${format(e, 'HH:mm')}`
      }
      return `il ${format(s, 'd MMM', { locale: it })} dalle ${format(s, 'HH:mm')} alle ${format(e, 'HH:mm')}`
    }
    return `dal ${format(s, 'd MMM HH:mm', { locale: it })} al ${format(e, 'd MMM HH:mm', { locale: it })}`
  }

  interface ScheduleHint {
    id: string
    type: 'start' | 'end'
    targetDate: Date
    label: string
  }

  const formatHintLabel = (type: 'start' | 'end', targetDate: Date) => {
    const timeStr = format(targetDate, 'HH:mm')
    const isSameAsCurrentStart = isSameDay(targetDate, startDateTime)

    if (type === 'start') {
      if (isSameAsCurrentStart) {
        return `Vuoi farlo iniziare alle ${timeStr}?`
      }
      const dayStr = targetDate.getFullYear() !== startDateTime.getFullYear()
        ? format(targetDate, 'd MMMM yyyy', { locale: it })
        : format(targetDate, 'd MMMM', { locale: it })
      return `Vuoi farlo iniziare il ${dayStr} alle ${timeStr}?`
    } else {
      if (isSameAsCurrentStart) {
        return `Vuoi concluderlo alle ${timeStr}?`
      }
      const dayStr = targetDate.getFullYear() !== startDateTime.getFullYear()
        ? format(targetDate, 'd MMMM yyyy', { locale: it })
        : format(targetDate, 'd MMMM', { locale: it })
      return `Vuoi concluderlo il ${dayStr} alle ${timeStr}?`
    }
  }

  const getHints = (): ScheduleHint[] => {
    if (overlappingSteps.length === 0) return []

    const hints: ScheduleHint[] = []

    overlappingSteps.forEach((step, index) => {
      const stepStart = new Date(step.startDateTime)
      const stepEnd = new Date(step.endDateTime)

      // Evento precedente: termina dopo l'inizio del nostro step -> suggerisci di farlo iniziare al termine dell'evento precedente
      if (stepEnd.getTime() > startDateTime.getTime() && stepEnd.getTime() !== startDateTime.getTime()) {
        hints.push({
          id: `start_${step.title}_${index}`,
          type: 'start',
          targetDate: stepEnd,
          label: formatHintLabel('start', stepEnd),
        })
      }

      // Evento successivo: inizia prima della fine del nostro step -> suggerisci di concluderlo all'inizio dell'evento successivo
      if (stepStart.getTime() < endDateTime.getTime() && stepStart.getTime() > startDateTime.getTime()) {
        hints.push({
          id: `end_${step.title}_${index}`,
          type: 'end',
          targetDate: stepStart,
          label: formatHintLabel('end', stepStart),
        })
      }
    })

    // Rimuovi eventuali duplicati di orario
    const uniqueHints: ScheduleHint[] = []
    const seen = new Set<string>()
    for (const h of hints) {
      const key = `${h.type}_${h.targetDate.getTime()}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueHints.push(h)
      }
    }

    return uniqueHints
  }

  const hints = getHints()
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  const currentConflictKey = overlappingSteps.map(s => `${s.title}_${s.startDateTime}_${s.endDateTime}`).join('|')
  const isPopupDismissed = dismissedKey === currentConflictKey

  const applyHint = (hint: ScheduleHint) => {
    if (hint.type === 'end') {
      setEndDateTime(hint.targetDate)
    } else if (hint.type === 'start') {
      const duration = Math.max(15 * 60 * 1000, endDateTime.getTime() - startDateTime.getTime())
      setStartDateTime(hint.targetDate)
      if (hint.targetDate.getTime() >= endDateTime.getTime()) {
        setEndDateTime(new Date(hint.targetDate.getTime() + duration))
      }
    }
  }

  useEffect(() => {
    if (isAfter(startDateTime, endDateTime))
      setEndDateTime(addHours(startDateTime, 1))
  }, [startDateTime])

  const getSubmitData = (): TripStep<any> => {
    return {
      title: _title || _location?.name || 'Tappa',
      type: _type,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      extraData: {
        arrivedBy: _vehicle,
        ...(_location && { location: _location }),
      },
    }
  }

  const getBackgroundLocations = () => {
    const locations: Location[] = []
    trip.steps?.forEach((step) => {
      if (step.extraData?.location) locations.push(step.extraData.location)
    })
    return locations
  }

  const getDefaultCenter = () => {
    const sortedSteps = [...(trip.steps || [])].sort(
      (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    )
    const pastSteps = sortedSteps.filter(s => new Date(s.startDateTime).getTime() <= startDateTime.getTime())
    
    for (let i = pastSteps.length - 1; i >= 0; i--) {
      const step = pastSteps[i]
      if (step.extraData?.location) return step.extraData.location
    }
    
    for (let i = sortedSteps.length - 1; i >= 0; i--) {
      const step = sortedSteps[i]
      if (step.extraData?.location) return step.extraData.location
    }
    
    return undefined
  }

  const backgroundLocations = getBackgroundLocations()
  const defaultCenter = getDefaultCenter()

  const handleBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/trip-details')
  }

  const heading = mode === 'update' ? t(TranslationsKeys.trip_updateStep) : t(TranslationsKeys.trip_addStep)
  const submitLabel = mode === 'update' ? 'Salva modifiche' : t(TranslationsKeys.trip_addStep)

  return (
    <KeyboardAvoider style={wrapperStyles}>
      <StatusBar style="light" />

      {/* Pop-up in sovrimpressione per gli hint di orario */}
      {overlappingSteps.length > 0 && hints.length > 0 && !isPopupDismissed && (
        <View style={[floatingPopupContainerStyle, { top: insets.top + 56 }]}>
          <View style={floatingPopupHeaderStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="warning" size={17} color="#D97706" />
              <Text style={floatingPopupTitleStyle} numberOfLines={1}>
                {overlappingSteps.length === 1
                  ? 'Orario sovrapposto'
                  : `Sovrapposizione (${overlappingSteps.length} tappe)`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setDismissedKey(currentConflictKey)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={floatingPopupCloseButtonStyle}
            >
              <Ionicons name="close" size={18} color="#78350F" />
            </TouchableOpacity>
          </View>

          <Text style={floatingPopupSubtitleStyle}>
            Conflitto con <Text style={{ fontWeight: '700' }}>"{overlappingSteps[0].title}"</Text>
            {overlappingSteps.length > 1 && ` e altre ${overlappingSteps.length - 1}`}
          </Text>

          <View style={floatingHintsListStyle}>
            {hints.map((hint) => (
              <TouchableOpacity
                key={hint.id}
                style={floatingHintButtonStyle}
                onPress={() => applyHint(hint)}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="bulb" size={16} color="#D97706" />
                  <Text style={floatingHintButtonTextStyle}>{hint.label}</Text>
                </View>
                <Ionicons name="chevron-forward-circle" size={19} color="#B45309" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        {...keyboardScrollProps}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Intestazione compatta con gradiente, come "Nuovo viaggio" */}
        <LinearGradient
          colors={['#E11D48', '#FF5A5F', '#FF7A59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[heroStyles.hero, { paddingTop: Math.max(insets.top, 16) + 4 }]}
        >
          <View style={heroStyles.row}>
            <TouchableOpacity style={heroStyles.backButton} onPress={handleBack} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color="white" />
            </TouchableOpacity>
            <Text style={heroStyles.title}>{heading}</Text>
            {onDelete ? (
              <TouchableOpacity style={heroStyles.backButton} onPress={onDelete} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <View style={heroStyles.spacer} />
            )}
          </View>

          {!!trip && (
            <View style={heroStyles.previewRow}>
              {!!trip.country?.id && <CountryFlag countryCode={String(trip.country.id)} height={14} isCircle resolution="w80" />}
              <Text style={heroStyles.previewText} numberOfLines={1}>
                {trip.city} · {format(startDateTime, 'EEE d MMM', { locale: it })}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={heroStyles.bodySheet}>
          {/* 1. Posizione: ricerca, mappa e luogo selezionato */}
          <View style={sectionStyle}>
            <SectionHeader icon="location" color="#FF5A5F" background="#FFF1F2" title="POSIZIONE" subtitle="Cerca un luogo o toccalo sulla mappa" />
            <LocationField
              location={_location}
              setLocation={setLocation}
              backgroundLocations={backgroundLocations}
              defaultCenter={defaultCenter}
            />
          </View>

          {/* 2. Dettagli: tipo e titolo */}
          <View style={sectionStyle}>
            <SectionHeader icon="options" color="#7C3AED" background="#F5F3FF" title="DETTAGLI" subtitle="Che tipo di tappa è" />
            <RadioField
              label={t(TranslationsKeys.trip_step_type)}
              value={_type}
              onChange={(type) => setType(type as StepType)}
              segmented
              options={Object.values(StepType).map((type) => ({
                value: type,
                label: t(TranslationsKeys[`step_type_${type}`]),
                icon: getStepTypeIcon(type),
              }))}
            />
            {_type === StepType.ACCOMODATION && (
              <TouchableOpacity style={importButtonStyle} onPress={() => setIsCalendarOpen(true)} activeOpacity={0.8} disabled={isImporting}>
                {isImporting ? (
                  <ActivityIndicator size="small" color="#FF5A5F" />
                ) : (
                  <Ionicons name="calendar-outline" size={17} color="#FF5A5F" />
                )}
                <Text style={importButtonTextStyle}>
                  {isImporting ? 'Cerco l’indirizzo…' : 'Importa da una prenotazione nel calendario'}
                </Text>
              </TouchableOpacity>
            )}
            <TextField
              label="Titolo personalizzato"
              value={_title}
              onChange={setTitle}
            />
          </View>

          {/* 3. Orario */}
          <View style={sectionStyle}>
            <SectionHeader icon="time" color="#0284C7" background="#E0F2FE" title="ORARIO" subtitle="Quando inizia e quando finisce" />
            <DateTimeField
              label={t(TranslationsKeys.trip_step_startDateTime)}
              mode="datetime"
              value={startDateTime}
              onChange={setStartDateTime}
              minuteInterval={10}
            />
            <DateTimeField
              label={t(TranslationsKeys.trip_step_endDateTime)}
              mode="datetime"
              value={endDateTime}
              onChange={setEndDateTime}
              minuteInterval={10}
              minDate={addMinutes(startDateTime, 10)}
            />
          </View>

          {overlappingSteps.length > 0 && (
            <View style={errorContainerStyle}>
              <View style={errorHeaderStyle}>
                <Ionicons name="warning" size={17} color="#D32F2F" />
                <Text style={errorTitleStyle}>
                  {overlappingSteps.length === 1
                    ? "Orario sovrapposto con un'altra tappa:"
                    : `Orario sovrapposto con ${overlappingSteps.length} altre tappe:`}
                </Text>
              </View>
              <View style={errorListStyle}>
                {overlappingSteps.map((step, idx) => (
                  <Text key={`${step.title}_${step.startDateTime}_${idx}`} style={errorItemTextStyle}>
                    {overlappingSteps.length > 1 ? '• ' : ''}
                    <Text style={{ fontWeight: '700' }}>"{step.title}"</Text>: {formatStepTimeRange(step)}
                  </Text>
                ))}
              </View>

              {hints.length > 0 && (
                <View style={hintsContainerStyle}>
                  <View style={hintsTitleRowStyle}>
                    <Ionicons name="bulb-outline" size={15} color="#B45309" />
                    <Text style={hintsHeaderTextStyle}>Suggerimenti:</Text>
                  </View>
                  <View style={hintsListStyle}>
                    {hints.map((hint) => (
                      <TouchableOpacity
                        key={hint.id}
                        style={hintButtonStyle}
                        onPress={() => applyHint(hint)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons
                            name={hint.type === 'start' ? 'time-outline' : 'checkmark-circle-outline'}
                            size={15}
                            color="#B45309"
                          />
                          <Text style={hintButtonTextStyle}>{hint.label}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#B45309" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <CalendarImportModal
        visible={isCalendarOpen}
        rangeStart={subDays(new Date(trip?.startDate ?? start), 3)}
        rangeEnd={addDays(new Date(trip?.endDate ?? end), 3)}
        onClose={() => setIsCalendarOpen(false)}
        onSelect={importFromCalendar}
      />

      {/* Pulsante sempre visibile in basso */}
      <View style={[bottomBarStyle, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          onPress={() => onSubmit(getSubmitData())}
          disabled={!isFormValid()}
          activeOpacity={0.85}
          style={[submitButtonStyle, !isFormValid() && submitButtonDisabledStyle]}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={submitTextStyle}>{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoider>
  )
}

// Intestazione di una scheda: icona colorata, titolo e sottotitolo
const SectionHeader = ({
  icon,
  color,
  background,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  color: string
  background: string
  title: string
  subtitle: string
}) => (
  <View style={sectionHeaderStyle}>
    <View style={[sectionHeaderIconStyle, { backgroundColor: background }]}>
      <Ionicons name={icon} size={17} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={sectionHeaderTitleStyle}>{title}</Text>
      <Text style={sectionHeaderSubtitleStyle}>{subtitle}</Text>
    </View>
  </View>
)

export default StepForm

export interface Props {
  start: Date
  end: Date
  title?: string
  type?: StepType
  vehicle?: VEHICLES
  location?: Location
  // Aggiunta o modifica: cambia il titolo della pagina e il testo del pulsante
  mode?: 'add' | 'update'
  // Se presente compare il pulsante "elimina" nell'intestazione (modifica di una tappa esistente)
  onDelete?: () => void
  onSubmit: (data: TripStep<any>) => void
}

const wrapperStyles: ViewStyle = {
  flex: 1,
  width: '100%',
  backgroundColor: '#F8F9FA',
}

const sectionHeaderStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
}

const sectionHeaderIconStyle: ViewStyle = {
  width: 34,
  height: 34,
  borderRadius: 11,
  alignItems: 'center',
  justifyContent: 'center',
}

const sectionHeaderTitleStyle: TextStyle = {
  fontSize: 12,
  fontWeight: '800',
  color: '#374151',
  letterSpacing: 0.6,
}

const sectionHeaderSubtitleStyle: TextStyle = {
  fontSize: 12,
  color: '#9CA3AF',
  fontWeight: '500',
  marginTop: 1,
}

const sectionStyle: ViewStyle = {
  backgroundColor: 'white',
  borderRadius: 22,
  padding: 16,
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
  gap: 14,
}

const heroStyles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Segnaposto invisibile che tiene il titolo al centro quando a destra non c'è nessun pulsante
  spacer: {
    width: 42,
    height: 42,
  },
  // Stesse misure dei pulsanti della schermata del viaggio
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  previewText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  bodySheet: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -18,
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 18,
  },
})

const bottomBarStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  paddingHorizontal: 16,
  paddingTop: 10,
  backgroundColor: 'rgba(248, 249, 250, 0.96)',
}

const submitButtonStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 50,
  borderRadius: 16,
  backgroundColor: 'tomato',
  shadowColor: 'tomato',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.28,
  shadowRadius: 9,
  elevation: 5,
}

const submitButtonDisabledStyle: ViewStyle = {
  backgroundColor: '#CBD5E1',
  shadowOpacity: 0,
  elevation: 0,
}

const submitTextStyle: TextStyle = {
  color: '#FFFFFF',
  fontSize: 15.5,
  fontWeight: '800',
  letterSpacing: -0.2,
}

const errorContainerStyle: ViewStyle = {
  backgroundColor: '#FFEBEE',
  borderColor: '#FFCDD2',
  borderWidth: 1,
  borderRadius: 14,
  paddingVertical: 12,
  paddingHorizontal: 14,
  gap: 8,
}

const errorHeaderStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
}

const errorTitleStyle: TextStyle = {
  color: '#C62828',
  fontSize: 14,
  fontWeight: '700',
}

const errorListStyle: ViewStyle = {
  gap: 5,
  paddingLeft: 4,
}

const errorItemTextStyle: TextStyle = {
  color: '#B71C1C',
  fontSize: 13,
  lineHeight: 18,
}

const hintsContainerStyle: ViewStyle = {
  marginTop: 10,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: '#FFCDD2',
  gap: 8,
}

const hintsTitleRowStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
}

const hintsHeaderTextStyle: TextStyle = {
  color: '#8C1D1D',
  fontSize: 12,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

const hintsListStyle: ViewStyle = {
  gap: 6,
}

const hintButtonStyle: ViewStyle = {
  backgroundColor: '#FFF8E1',
  borderWidth: 1,
  borderColor: '#FFE082',
  borderRadius: 10,
  paddingVertical: 8,
  paddingHorizontal: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const hintButtonTextStyle: TextStyle = {
  color: '#78350F',
  fontSize: 13,
  fontWeight: '600',
  flexShrink: 1,
}

const floatingPopupContainerStyle: ViewStyle = {
  position: 'absolute',
  top: 56,
  left: 14,
  right: 14,
  zIndex: 9999,
  elevation: 10,
  backgroundColor: '#FFFBEB',
  borderColor: '#FCD34D',
  borderWidth: 1.5,
  borderRadius: 16,
  padding: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 10,
  gap: 8,
}

const floatingPopupHeaderStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const floatingPopupTitleStyle: TextStyle = {
  color: '#92400E',
  fontSize: 14,
  fontWeight: '800',
  letterSpacing: 0.2,
}

const floatingPopupCloseButtonStyle: ViewStyle = {
  padding: 2,
}

const floatingPopupSubtitleStyle: TextStyle = {
  color: '#78350F',
  fontSize: 13,
  marginTop: -2,
}

const floatingHintsListStyle: ViewStyle = {
  gap: 6,
  marginTop: 2,
}

const floatingHintButtonStyle: ViewStyle = {
  backgroundColor: '#FEF3C7',
  borderColor: '#FDE68A',
  borderWidth: 1,
  borderRadius: 12,
  paddingVertical: 9,
  paddingHorizontal: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
}

const floatingHintButtonTextStyle: TextStyle = {
  color: '#78350F',
  fontSize: 13,
  fontWeight: '700',
  flex: 1,
}

const importButtonStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 11,
  borderRadius: 14,
  backgroundColor: '#FFF1F2',
}

const importButtonTextStyle: TextStyle = {
  fontSize: 13.5,
  fontWeight: '700',
  color: '#FF5A5F',
}
