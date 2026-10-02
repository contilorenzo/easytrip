import React, { useEffect, useMemo, useState } from 'react'
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import DateRangeField from './DateRangeField'
import { KeyboardAvoider, keyboardScrollProps } from '../common/KeyboardAvoider'
import { addTrip, addFullTrip } from '../common/db/utils'
import JoinTripForm from '../Account/JoinTripForm'
import { loadTripIdeas, IdeaAttraction, ItineraryStep } from '../../services/tripIdeas'
import { buildIdeaSteps, buildItinerarySteps } from '../../utils/ideaSteps'
import AiSuggestions, { AiSuggestionsResult } from './AiSuggestions'
import { useTripsContext } from '../../state/TripsContext'
import DropdownField from '../FormElements/DropdownField'
import { AutocompleteDropdownItem } from 'react-native-autocomplete-dropdown'
import { Ionicons } from '@expo/vector-icons'
import { addDays, isAfter, format } from 'date-fns'
import { it } from 'date-fns/locale'
import { router, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CountryFlag from '../common/CountryFlag/CountryFlag'
import { extractFlagTheme } from '../../utils/countryTheme'

const today = new Date()
const oneWeekFromToday = new Date(Date.now() + 604800000)

const NewTripForm = () => {
  const context = useTripsContext()
  const insets = useSafeAreaInsets()

  // Da un'idea della home: città e paese già compilati
  const params = useLocalSearchParams<{ city?: string; country?: string; days?: string; idea?: string }>()
  const [country, setCountry] = useState<AutocompleteDropdownItem | null>(null)
  const [city, setCity] = useState<string>(params.city ?? '')
  const [startDate, setStartDate] = useState<Date>(today)
  // Con la durata di un'idea: parte oggi e dura quel numero di giorni (primo e ultimo compresi)
  const ideaDays = Number(params.days)
  const [endDate, setEndDate] = useState<Date>(ideaDays > 0 ? addDays(today, ideaDays - 1) : oneWeekFromToday)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Tappe proposte dall'idea di viaggio (se si arriva da lì) e quelle tolte dall'utente
  const [ideaStops, setIdeaStops] = useState<IdeaAttraction[]>([])
  const [ideaItinerary, setIdeaItinerary] = useState<ItineraryStep[]>([])
  const [ideaDeselected, setIdeaDeselected] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!params.idea) return
    loadTripIdeas().then((ideas) => {
      const idea = ideas.find((item) => item.id === params.idea)
      if (!idea) return
      setIdeaStops(idea.attractions)
      setIdeaItinerary(idea.itinerary)
    })
  }, [])

  const [aiResult, setAiResult] = useState<AiSuggestionsResult>({ steps: [], isResolving: false })

  // Voci della lista: il programma generato dal server se c'è, altrimenti le sole tappe di Wikivoyage
  const ideaItems = useMemo(
    () =>
      ideaItinerary.length > 0
        ? ideaItinerary.map((step, index) => ({ key: `${index}-${step.placeName}`, label: step.title, day: step.day, isFood: step.type === 'food' }))
        : ideaStops.map((stop) => ({ key: stop.name, label: stop.name, day: undefined as number | undefined, isFood: false })),
    [ideaItinerary, ideaStops]
  )

  const selectedIdeaSteps = useMemo(() => {
    if (ideaItinerary.length > 0) {
      return buildItinerarySteps(
        ideaItinerary.filter((step, index) => !ideaDeselected[`${index}-${step.placeName}`]),
        startDate,
        endDate
      )
    }
    return buildIdeaSteps(ideaStops.filter((stop) => !ideaDeselected[stop.name]), city.trim(), startDate, endDate)
  }, [ideaItinerary, ideaStops, ideaDeselected, city, startDate, endDate])

  useEffect(() => {
    if (isAfter(startDate, endDate)) {
      setEndDate(addDays(startDate, 7))
    }
  }, [startDate])

  useEffect(() => {
    if (!context.countries) {
      getCountriesOptions().then((data) => {
        context.setCountries(data)
      })
    }
  }, [context.countries])

  // Preseleziono il paese dell'idea appena le opzioni sono disponibili
  useEffect(() => {
    if (!params.country || country || !context.countries) return
    const preset = context.countries.find((option) => String(option.id) === params.country)
    if (preset) setCountry(preset)
  }, [context.countries])

  // Servono paese e città; il pulsante resta spento anche mentre l'AI lavora
  const isFormValid =
    !!country && city.trim().length > 0 && !!startDate && !!endDate && !isSubmitting && !aiResult.isResolving

  const handleBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  const handleCreateTrip = async () => {
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (country?.id) {
        extractFlagTheme(country.id)
      }
      const newTrip = {
        country: country as any,
        city: city.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }
      const allSteps = [...selectedIdeaSteps, ...aiResult.steps]
      if (allSteps.length > 0) {
        await addFullTrip({ ...newTrip, steps: allSteps }, context)
      } else {
        await addTrip(newTrip, context)
      }
      if (router.canGoBack()) router.back()
      else router.replace('/')
    } catch (error) {
      console.error('Failed to create trip:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!context.countries) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="tomato" />
        <Text style={styles.loadingText}>Caricamento paesi in corso...</Text>
      </View>
    )
  }

  const showPreview = !!country || city.trim().length > 0

  return (
    <KeyboardAvoider style={styles.keyboardContainer}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        {...keyboardScrollProps}
      >
        {/* Intestazione compatta con gradiente */}
        <LinearGradient
          colors={['#E11D48', '#FF5A5F', '#FF7A59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: Math.max(insets.top, 16) + 4 }]}
        >
          <View style={styles.heroRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Nuovo viaggio</Text>
            <View style={styles.heroSpacer} />
          </View>

          {showPreview && (
            <View style={styles.previewRow}>
              {!!country?.id && <CountryFlag countryCode={String(country.id)} height={14} isCircle resolution="w80" />}
              <Text style={styles.previewText} numberOfLines={1}>
                {city.trim() ? city.trim() : 'Città'}
                {country?.title ? `, ${country.title}` : ''}
                {'  ·  '}
                {format(startDate, 'd MMM', { locale: it })} – {format(endDate, 'd MMM', { locale: it })}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.bodySheet}>
          {/* Dove e quando, in un'unica scheda */}
          <View style={styles.card}>
            <DropdownField
              key={context.countries ? 'ready' : 'loading'}
              initialId={params.country}
              label={t(TranslationsKeys.trip_country)}
              onChange={setCountry}
              options={context.countries}
            />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t(TranslationsKeys.trip_city)}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="location-outline" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="es. Roma, Barcellona, Tokyo..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <DateRangeField
              start={startDate}
              end={endDate}
              onChange={(start, end) => {
                setStartDate(start)
                setEndDate(end)
              }}
            />
          </View>

          {/* Tappe proposte dall'idea di viaggio: si possono togliere */}
          {ideaItems.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Programma proposto ({ideaItems.filter((item) => !ideaDeselected[item.key]).length})</Text>
              {ideaItems.map((item, index) => {
                const removed = !!ideaDeselected[item.key]
                const newDay = item.day !== undefined && item.day !== ideaItems[index - 1]?.day
                return (
                  <React.Fragment key={item.key}>
                    {newDay && <Text style={styles.ideaDayLabel}>GIORNO {item.day}</Text>}
                    <TouchableOpacity
                      style={styles.ideaStopRow}
                      onPress={() => setIdeaDeselected((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={removed ? 'square-outline' : 'checkbox'} size={22} color={removed ? '#CBD5E1' : '#FF5A5F'} />
                      {item.isFood && <Ionicons name="restaurant-outline" size={14} color="#94A3B8" />}
                      <Text style={[styles.ideaStopName, removed && styles.ideaStopRemoved]} numberOfLines={2}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                )
              })}
            </View>
          )}

          {/* Suggerimenti AI (opzionali): non servono se il viaggio parte da un programma già proposto */}
          {ideaItems.length === 0 && (
            <AiSuggestions
              city={city}
              country={country}
              startDate={startDate}
              endDate={endDate}
              onChange={setAiResult}
            />
          )}

          {/* Alternativa: unirsi a un viaggio condiviso con un codice invito */}
          <JoinTripForm title="Oppure unisciti a un viaggio" replaceScreen />
        </View>
      </ScrollView>

      {/* Pulsante sempre visibile in basso */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
          onPress={handleCreateTrip}
          disabled={!isFormValid}
          activeOpacity={0.85}
        >
          {isSubmitting || aiResult.isResolving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="checkmark-circle" size={20} color="white" />
          )}
          <Text style={styles.submitText}>
            {aiResult.isResolving ? 'Attendi i suggerimenti…' : t(TranslationsKeys.trip_addTrip)}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoider>
  )
}

const getCountriesOptions = async () => {
  try {
    const res = await fetch('https://flagcdn.com/it/codes.json')
    const countriesObj = await res.json()

    const countriesOptions: AutocompleteDropdownItem[] = Object.entries(
      countriesObj
    ).map(([key, value]) => ({
      id: key,
      title: String(value ?? ''),
    }))

    return countriesOptions
  } catch (error) {
    console.error('Failed to load countries:', error)
    return []
  }
}

const styles = StyleSheet.create({
  ideaStopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  ideaStopName: { flex: 1, fontSize: 14.5, fontWeight: '600', color: '#111827' },
  ideaDayLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6, marginTop: 6 },
  ideaStopRemoved: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Segnaposto invisibile che tiene il titolo al centro
  heroSpacer: {
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
  heroTitle: {
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
  },
  bodySheet: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -18,
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 10,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(248, 249, 250, 0.96)',
  },
  submitButton: {
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
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
})

export default NewTripForm
