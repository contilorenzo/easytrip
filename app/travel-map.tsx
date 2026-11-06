import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ScratchMap, { MAP_PALETTES } from '../src/components/TravelMap/ScratchMap'
import CountryFlag from '../src/components/common/CountryFlag/CountryFlag'
import { useTripsContext } from '../src/state/TripsContext'
import CountryPopup from '../src/components/TravelMap/CountryPopup'
import PastVisitsModal from '../src/components/TravelMap/PastVisitsModal'
import { useAccountContext } from '../src/state/AccountContext'
import { addPastVisit, loadPastVisits, PastVisit, removePastVisit } from '../src/services/pastVisits'
import { getCountriesOptions } from '../src/services/countries'
import { CountrySummary, summarizeCountries } from '../src/utils/visitedCountries'

// Paesi riconosciuti dall'ONU: servono per la percentuale di mondo visitato
const WORLD_COUNTRIES = 195

const CountryChips = ({ countries, color }: { countries: CountrySummary[]; color: string }) => (
  <View style={styles.chips}>
    {countries.map((country) => (
      <View key={country.code} style={[styles.chip, { borderColor: color }]}>
        <CountryFlag countryCode={country.code} height={14} resolution="w40" />
        <Text style={styles.chipText}>{country.title}</Text>
        {country.visits.length > 1 && <Text style={styles.chipCount}>×{country.visits.length}</Text>}
      </View>
    ))}
  </View>
)

const TravelMapScreen = () => {
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const nativeHeader = Platform.OS === 'ios'
  const { trips, countries, setCountries } = useTripsContext()
  const { user } = useAccountContext()
  const [dark, setDark] = useState(true)
  const [pastVisits, setPastVisits] = useState<PastVisit[]>([])
  const [pastVisitsOpen, setPastVisitsOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  // Mentre si usa la mappa la pagina non deve scorrere
  const [mapActive, setMapActive] = useState(false)

  // Viaggi precedenti (sul telefono o sull'account)
  useEffect(() => {
    let active = true
    loadPastVisits(user?.id ?? null).then((visits) => {
      if (active) setPastVisits(visits)
    })
    return () => {
      active = false
    }
  }, [user?.id])

  // Nomi dei paesi per il popup e per il form
  useEffect(() => {
    if (!countries) getCountriesOptions().then((data) => setCountries(data))
  }, [countries])


  const palette = dark ? MAP_PALETTES.dark : MAP_PALETTES.light
  const summary = useMemo(() => summarizeCountries(trips, pastVisits), [trips, pastVisits])
  const visitedSet = useMemo(() => new Set(summary.visited.map((c) => c.code)), [summary])
  const upcomingSet = useMemo(() => new Set(summary.upcoming.map((c) => c.code)), [summary])
  const percent = Math.round((summary.visited.length / WORLD_COUNTRIES) * 1000) / 10

  // Scheda del paese toccato (anche se non ancora visitato)
  const selected = useMemo(() => {
    if (!selectedCode) return null
    const info = summary.byCode.get(selectedCode)
    const name = countries?.find((item) => String(item.id) === selectedCode)?.title
    return {
      code: selectedCode,
      title: info?.title ?? name ?? selectedCode.toUpperCase(),
      status: info?.status ?? null,
      visits: info?.visits ?? [],
    }
  }, [selectedCode, summary, countries])

  const popup = selected && (
    <CountryPopup
      code={selected.code}
      title={selected.title}
      status={selected.status}
      visits={selected.visits}
      palette={palette}
      onClose={() => setSelectedCode(null)}
    />
  )

  const handleBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  return (
    <View style={styles.screen}>
      {/* Niente swipe per tornare indietro: lo spostamento sulla mappa non deve far uscire dalla pagina (c'è il pulsante).
          Su iOS indietro e cambio tema stanno nella barra nativa (trasparente sopra il gradiente): con iOS 26 sono in liquid glass */}
      <Stack.Screen
        options={
          nativeHeader
            ? {
                headerShown: true,
                headerTransparent: true,
                headerTitle: 'La mia mappa',
                headerTintColor: '#F9FAFB',
                headerBackButtonDisplayMode: 'minimal',
                gestureEnabled: false,
              }
            : { headerShown: false, gestureEnabled: false }
        }
      />
      {nativeHeader && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={dark ? 'sun.max' : 'moon'}
            accessibilityLabel="Cambia tema della mappa"
            onPress={() => setDark((prev) => !prev)}
          />
        </Stack.Toolbar>
      )}
      <StatusBar style="light" />
      <LinearGradient colors={['#34343C', '#17171B', '#050506']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />

      {/* Intestazione disegnata a mano: solo dove non c'è la barra nativa (Android) */}
      {!nativeHeader && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleBack} hitSlop={10} style={styles.headerButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>La mia mappa</Text>
          <TouchableOpacity onPress={() => setDark((prev) => !prev)} hitSlop={10} style={styles.headerButton} activeOpacity={0.7}>
            <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={20} color="#F3F4F6" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: nativeHeader ? insets.top + 56 : 0, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!mapActive}
      >
        {/* A tutta larghezza: il contenuto ha 16 di margine per lato, qui lo annullo */}
        <View style={styles.mapBleed}>
          <ScratchMap
            width={width}
            visited={visitedSet}
            upcoming={upcomingSet}
            palette={palette}
            selectedCode={selectedCode}
            onSelectCountry={setSelectedCode}
            onInteractionChange={setMapActive}
            onToggleFullscreen={() => setFullscreen(true)}
          />
          {!fullscreen && popup && <View style={styles.popupWrap}>{popup}</View>}
        </View>
        <Text style={styles.hint}>Pizzica per ingrandire, trascina per spostarti, tocca un paese per i dettagli</Text>

        {/* Numeri */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: palette.visited }]}>{summary.visited.length}</Text>
            <Text style={styles.statLabel}>PAESI VISITATI</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: palette.upcoming }]}>{summary.upcoming.length}</Text>
            <Text style={styles.statLabel}>IN PROGRAMMA</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{percent}%</Text>
            <Text style={styles.statLabel}>DEL MONDO</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.pastButton} onPress={() => setPastVisitsOpen(true)} activeOpacity={0.85}>
          <Ionicons name="time-outline" size={19} color="#FFFFFF" />
          <Text style={styles.pastButtonText}>Registra viaggi precedenti</Text>
          {pastVisits.length > 0 && <Text style={styles.pastButtonCount}>{pastVisits.length}</Text>}
        </TouchableOpacity>

        {/* Elenchi */}
        <View style={styles.card}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: palette.visited }]} />
            <Text style={styles.legendTitle}>Visitati</Text>
          </View>
          {summary.visited.length > 0 ? (
            <CountryChips countries={summary.visited} color={palette.visited} />
          ) : (
            <Text style={styles.empty}>Qui compariranno i paesi dei viaggi già iniziati.</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: palette.upcoming }]} />
            <Text style={styles.legendTitle}>In programma</Text>
          </View>
          {summary.upcoming.length > 0 ? (
            <CountryChips countries={summary.upcoming} color={palette.upcoming} />
          ) : (
            <Text style={styles.empty}>Nessun nuovo paese in programma: è ora di pianificare!</Text>
          )}
        </View>
      </ScrollView>

      <PastVisitsModal
        visible={pastVisitsOpen}
        onClose={() => setPastVisitsOpen(false)}
        visits={pastVisits}
        countries={countries ?? []}
        onAdd={async (visit) => setPastVisits(await addPastVisit(user?.id ?? null, pastVisits, visit))}
        onRemove={async (id) => setPastVisits(await removePastVisit(user?.id ?? null, pastVisits, id))}
      />

      {/* Mappa a schermo intero (il telefono resta in verticale) */}
      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent onRequestClose={() => setFullscreen(false)}>
        <View style={{ flex: 1, backgroundColor: palette.background }}>
          <ScratchMap
            key={`${width}x${height}`}
            width={width}
            height={height}
            controlsBottom={Math.max(insets.bottom, 12) + 6}
            visited={visitedSet}
            upcoming={upcomingSet}
            palette={palette}
            selectedCode={selectedCode}
            onSelectCountry={setSelectedCode}
            onToggleFullscreen={() => setFullscreen(false)}
            isFullscreen
          />
          {popup && <View style={[styles.fullscreenPopup, { bottom: Math.max(insets.bottom, 12) + 62 }]}>{popup}</View>}
          <TouchableOpacity style={[styles.fullscreenClose, { top: Math.max(insets.top, 12) }]} onPress={() => setFullscreen(false)} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

const GLASS = 'rgba(255, 255, 255, 0.06)'
const GLASS_BORDER = 'rgba(255, 255, 255, 0.1)'

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#050506' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  headerButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: GLASS_BORDER },
  title: { fontSize: 18, fontWeight: '800', color: '#F9FAFB' },
  content: { paddingHorizontal: 16, gap: 14 },
  mapBleed: { marginHorizontal: -16 },
  popupWrap: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  fullscreenPopup: { position: 'absolute', left: 16, right: 16 },
  fullscreenClose: { position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(30, 41, 59, 0.75)', alignItems: 'center', justifyContent: 'center' },
  pastButton: { height: 50, borderRadius: 16, backgroundColor: '#FF6347', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pastButtonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  pastButtonCount: { fontSize: 12, fontWeight: '800', color: '#FF6347', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  hint: { fontSize: 11.5, color: '#6B7280', textAlign: 'center', marginTop: -4 },
  stats: { flexDirection: 'row', backgroundColor: GLASS, borderRadius: 20, paddingVertical: 14, borderWidth: 1, borderColor: GLASS_BORDER },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#F9FAFB' },
  statLabel: { fontSize: 9.5, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.6 },
  statDivider: { width: 1, backgroundColor: GLASS_BORDER, marginVertical: 4 },
  card: { backgroundColor: GLASS, borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: GLASS_BORDER },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendTitle: { fontSize: 14.5, fontWeight: '800', color: '#F9FAFB' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  chipText: { fontSize: 12.5, fontWeight: '700', color: '#E5E7EB' },
  chipCount: { fontSize: 11.5, fontWeight: '700', color: '#9CA3AF' },
  empty: { fontSize: 13, color: '#9CA3AF' },
})

export default TravelMapScreen
