import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { addDays, differenceInCalendarDays, format, setHours, setMinutes, startOfDay, addMinutes } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAccountContext } from '../../state/AccountContext'
import { ROUTES } from '../common/db/routes'
import { Location, StepType, TripStep } from '../TripDetails/TripSteps/types'
import { fetchStepSuggestions, StepSuggestion } from '../../services/aiSuggestions'
import { geocodeQuery } from '../../services/geocoding'
import { filterPlausibleSuggestions, normalizeDayTimes } from '../../services/suggestionValidation'

// Proposta già pronta per essere aggiunta: l'AI ne ha dato le coordinate e le ho controllate
type ResolvedSuggestion = StepSuggestion & { location: Location }

const TRAVEL_STYLES: { id: string; label: string; icon: any }[] = [
  { id: 'culturale', label: 'Culturale', icon: 'library-outline' },
  { id: 'gastronomia', label: 'Gastronomia', icon: 'restaurant-outline' },
  { id: 'nightlife', label: 'Nightlife', icon: 'musical-notes-outline' },
  { id: 'natura', label: 'Natura', icon: 'leaf-outline' },
  { id: 'relax', label: 'Relax', icon: 'sunny-outline' },
  { id: 'avventura', label: 'Avventura', icon: 'compass-outline' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-outline' },
  { id: 'famiglia', label: 'Famiglia', icon: 'people-outline' },
]

const MAX_DAYS = 10

// Raggio dal centro della città entro cui cercare le tappe
const RADIUS_OPTIONS: { km: number; label: string }[] = [
  { km: 15, label: '15 km' },
  { km: 50, label: '50 km' },
  { km: 100, label: '100 km' },
  { km: 200, label: '200 km' },
]

export interface AiSuggestionsResult {
  // Tappe scelte dall'utente e con posizione trovata, pronte per essere salvate nel viaggio
  steps: TripStep<any>[]
  // true finché l'AI sta lavorando (richiesta in corso)
  isResolving: boolean
}

interface Props {
  city: string
  country: { id?: string | number; title?: string | null } | null
  startDate: Date
  endDate: Date
  onChange: (result: AiSuggestionsResult) => void
}

type Status = 'idle' | 'loading' | 'ready' | 'error'

const AiSuggestions = ({ city, country, startDate, endDate, onChange }: Props) => {
  const { user } = useAccountContext()

  // La scheda parte chiusa per tenere compatta la pagina; si apre da sola quando arrivano i risultati
  const [expanded, setExpanded] = useState(false)
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [radiusKm, setRadiusKm] = useState(50)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [suggestions, setSuggestions] = useState<ResolvedSuggestion[]>([])
  const [deselected, setDeselected] = useState<Record<string, boolean>>({})
  const runIdRef = useRef(0)

  const cityTrimmed = city.trim()
  const canSuggest = !!country && cityTrimmed.length > 0
  const days = Math.min(Math.max(differenceInCalendarDays(endDate, startDate) + 1, 1), MAX_DAYS)

  // Se cambia la destinazione le proposte non valgono più
  const destinationKey = `${country?.id ?? ''}_${cityTrimmed.toLowerCase()}`
  useEffect(() => {
    runIdRef.current += 1
    setSuggestions([])
    setDeselected({})
    setStatus('idle')
  }, [destinationKey])

  const toggleStyle = (id: string) =>
    setSelectedStyles((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))

  const handleSuggest = async () => {
    if (!canSuggest || selectedStyles.length === 0) return
    const runId = ++runIdRef.current
    setStatus('loading')
    setErrorMessage('')
    setSuggestions([])
    setDeselected({})

    try {
      const labels = TRAVEL_STYLES.filter((s) => selectedStyles.includes(s.id)).map((s) => s.label)
      const countryName = country?.title ?? ''
      const countryCode = typeof country?.id === 'string' ? country.id : undefined

      // Le proposte con le coordinate dell'AI e il centro della città (per controllare che non siano fuori zona)
      const [raw, cityLocation] = await Promise.all([
        fetchStepSuggestions({ city: cityTrimmed, country: countryName, days, styles: labels, radiusKm }),
        geocodeQuery(`${cityTrimmed}, ${countryName}`, cityTrimmed, countryCode),
      ])
      if (runIdRef.current !== runId) return

      const plausible = normalizeDayTimes(filterPlausibleSuggestions(raw, cityLocation ? { lat: cityLocation.coordinates.lat, lng: cityLocation.coordinates.lng } : null,
        radiusKm
      ))
      if (plausible.length === 0) throw new Error('Nessun suggerimento disponibile, riprova.')

      setSuggestions(
        plausible.map((s) => ({
          ...s,
          location: {
            name: s.placeName,
            address: s.address || `${s.placeName}, ${cityTrimmed}`,
            coordinates: { lat: s.lat, lng: s.lng },
          },
        }))
      )
      setStatus('ready')
      setExpanded(true)
    } catch (error: any) {
      if (runIdRef.current !== runId) return
      setErrorMessage(error?.message ?? 'Qualcosa è andato storto')
      setStatus('error')
    }
  }

  const toggleSuggestion = (id: string) => setDeselected((prev) => ({ ...prev, [id]: !prev[id] }))

  // Tappe pronte per il viaggio: selezionate e con posizione trovata
  const steps = useMemo<TripStep<any>[]>(() => {
    return suggestions
      .filter((s) => !deselected[s.id])
      .map((s) => {
        const dayStart = addDays(startOfDay(startDate), s.day - 1)
        const start = setMinutes(setHours(dayStart, s.startHour), s.startMinute)
        const end = addMinutes(start, s.durationMinutes)
        return {
          type: s.type === 'food' ? StepType.FOOD : StepType.VISIT,
          title: s.title,
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          extraData: { location: s.location },
        }
      })
  }, [suggestions, deselected, startDate])

  const isBusy = status === 'loading'

  // L'AI è al lavoro (richiesta o completamento delle posizioni): il form deve aspettare
  useEffect(() => {
    onChange({ steps, isResolving: isBusy })
  }, [steps, isBusy])

  const selectedCount = suggestions.filter((s) => !deselected[s.id]).length

  const suggestionsByDay = useMemo(() => {
    const groups: Record<number, ResolvedSuggestion[]> = {}
    suggestions.forEach((s) => {
      groups[s.day] = [...(groups[s.day] ?? []), s]
    })
    return Object.entries(groups)
      .map(([day, list]) => ({
        day: Number(day),
        list: [...list].sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute)),
      }))
      .sort((a, b) => a.day - b.day)
  }, [suggestions])

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.8}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={16} color="#FF5A5F" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Suggerisci tappe con l’AI</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {selectedCount > 0 ? `${selectedCount} tappe pronte da aggiungere` : 'Facoltativo · scegli lo stile del viaggio'}
          </Text>
        </View>
        {isBusy && <ActivityIndicator size="small" color="#FF5A5F" />}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
      </TouchableOpacity>

      {!expanded ? null : !user ? (
        <View style={styles.lockedBox}>
          <Text style={styles.helperText}>Accedi con il tuo account per usare i suggerimenti AI.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push(ROUTES.SETTINGS)} activeOpacity={0.8}>
            <Ionicons name="person-outline" size={15} color="#FF5A5F" />
            <Text style={styles.secondaryButtonText}>Accedi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Che tipo di viaggio vuoi fare?</Text>
          <View style={styles.chips}>
            {TRAVEL_STYLES.map((style) => {
              const active = selectedStyles.includes(style.id)
              return (
                <TouchableOpacity
                  key={style.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleStyle(style.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={style.icon} size={14} color={active ? 'white' : '#6B7280'} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{style.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.label}>Distanza massima dal centro</Text>
          <View style={styles.chips}>
            {RADIUS_OPTIONS.map((option) => {
              const active = radiusKm === option.km
              return (
                <TouchableOpacity
                  key={option.km}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setRadiusKm(option.km)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate-circle-outline" size={14} color={active ? 'white' : '#6B7280'} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {!canSuggest && <Text style={styles.helperText}>Compila prima paese e città.</Text>}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canSuggest || selectedStyles.length === 0 || status === 'loading') && styles.buttonDisabled,
            ]}
            onPress={handleSuggest}
            disabled={!canSuggest || selectedStyles.length === 0 || status === 'loading'}
            activeOpacity={0.85}
          >
            {status === 'loading' ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="sparkles" size={16} color="white" />
            )}
            <Text style={styles.primaryButtonText}>
              {status === 'loading' ? 'Sto preparando le idee…' : status === 'ready' ? 'Rigenera suggerimenti' : 'Suggerisci tappe'}
            </Text>
          </TouchableOpacity>

          {status === 'error' && <Text style={styles.errorText}>{errorMessage}</Text>}

          {status === 'ready' && (
            <View style={styles.results}>
              <Text style={styles.resultsNote}>
                Suggerimenti generati dall’AI: verifica orari e disponibilità. Tocca per escludere una tappa.
              </Text>

              {suggestionsByDay.map(({ day, list }) => (
                <View key={day} style={styles.dayBlock}>
                  <Text style={styles.dayTitle}>
                    Giorno {day} · {format(addDays(startDate, day - 1), 'EEE d MMM', { locale: it })}
                  </Text>
                  {list.map((s) => {
                    const isOff = !!deselected[s.id]
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.suggestion, isOff && styles.suggestionOff]}
                        onPress={() => toggleSuggestion(s.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isOff ? 'square-outline' : 'checkbox'}
                          size={22}
                          color={isOff ? '#CBD5E1' : '#FF5A5F'}
                        />
                        <View style={{ flex: 1 }}>
                          <View style={styles.suggestionTitleRow}>
                            <Ionicons
                              name={s.type === 'food' ? 'restaurant' : 'camera'}
                              size={13}
                              color={s.type === 'food' ? '#F59E0B' : '#0284C7'}
                            />
                            <Text style={styles.suggestionTitle} numberOfLines={2}>
                              {s.title}
                            </Text>
                          </View>
                          <Text style={styles.suggestionMeta}>
                            {String(s.startHour).padStart(2, '0')}:{String(s.startMinute).padStart(2, '0')} · {s.durationMinutes} min
                          </Text>
                          {!!s.description && (
                            <Text style={styles.suggestionDescription} numberOfLines={2}>
                              {s.description}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ))}

              <Text style={styles.summary}>
                {selectedCount} {selectedCount === 1 ? 'tappa verrà aggiunta' : 'tappe verranno aggiunte'} al viaggio
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginTop: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  chipActive: { backgroundColor: '#FF5A5F' },
  chipText: { fontSize: 12.5, fontWeight: '600', color: '#4B5563' },
  chipTextActive: { color: 'white' },
  helperText: { fontSize: 12.5, color: '#6B7280' },
  lockedBox: { gap: 10 },
  secondaryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
  },
  secondaryButtonText: { fontSize: 13, fontWeight: '700', color: '#FF5A5F' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
  },
  primaryButtonText: { color: 'white', fontSize: 14, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
  errorText: { fontSize: 12.5, color: '#EF4444' },
  results: { gap: 12 },
  resultsNote: { fontSize: 11.5, color: '#6B7280', lineHeight: 16 },
  dayBlock: { gap: 8 },
  dayTitle: { fontSize: 12.5, fontWeight: '800', color: '#4B5563', textTransform: 'capitalize' },
  suggestion: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FFFAFA',
    borderWidth: 1,
    borderColor: '#FDE2E4',
  },
  suggestionOff: { opacity: 0.5, backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  suggestionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestionTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', color: '#1E293B' },
  suggestionMeta: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  suggestionDescription: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 16 },
  summary: { fontSize: 12.5, fontWeight: '700', color: '#FF5A5F', textAlign: 'center' },
})

export default AiSuggestions
