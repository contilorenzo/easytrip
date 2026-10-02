import React, { useEffect, useState } from 'react'
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CountryFlag from '../common/CountryFlag/CountryFlag'
import ThemeBackground from '../common/ThemeBackground'
import { useFlagTheme } from '../../utils/countryTheme'
import { IDEA_CATEGORIES, IdeaCategory, loadTripIdeas, TripIdea } from '../../services/tripIdeas'
import TripIdeaModal from './TripIdeaModal'

const IdeaCard = ({ idea, onPress }: { idea: TripIdea; onPress: () => void }) => {
  const theme = useFlagTheme(idea.countryId)
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = !!idea.imageUrl && !imageFailed

  return (
    <TouchableOpacity style={styles.cardShadow} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.card}>
        {/* Parte alta: foto della destinazione (se manca o non si carica, bandiera sfocata) */}
        <View style={styles.photo}>
          {showImage ? (
            <Image source={{ uri: idea.imageUrl }} style={StyleSheet.absoluteFill} onError={() => setImageFailed(true)} />
          ) : (
            <ThemeBackground countryCode={idea.countryId} colors={theme.gradient} style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.flagBadge}>
            <CountryFlag countryCode={idea.countryId} height={24} isCircle resolution="w80" />
          </View>
          <View style={styles.daysPill}>
            <Ionicons name="calendar-outline" size={11} color="#FFFFFF" />
            <Text style={styles.daysText}>{idea.days} giorni</Text>
          </View>
        </View>

        {/* Parte bassa: testi su fondo bianco */}
        <View style={styles.info}>
          <View style={{ flex: 1 }}>
            <Text style={styles.city} numberOfLines={1}>{idea.city}</Text>
            <Text style={styles.tagline} numberOfLines={1}>{idea.tagline}</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color="#FF5A5F" />
        </View>
      </View>
    </TouchableOpacity>
  )
}

// Carosello di viaggi ipotetici da cui partire (POC)
const TripIdeas = () => {
  const [ideas, setIdeas] = useState<TripIdea[]>([])
  const [selected, setSelected] = useState<TripIdea | null>(null)
  const [filter, setFilter] = useState<IdeaCategory | 'all'>('all')

  // Idee dal database (aggiornato dal server), con cache sul telefono
  useEffect(() => {
    let active = true
    loadTripIdeas().then((result) => {
      if (active) setIdeas(result)
    })
    return () => {
      active = false
    }
  }, [])

  const handleDevRefresh = async () => {
    setIdeas(await loadTripIdeas({ force: true }))
  }

  if (ideas.length === 0) return null

  // Filtri solo per le categorie che hanno almeno una destinazione
  const availableCategories = IDEA_CATEGORIES.filter((category) => ideas.some((idea) => idea.category === category.id))
  const visibleIdeas = filter === 'all' ? ideas : ideas.filter((idea) => idea.category === filter)

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={15} color="#FF5A5F" />
        <Text style={[styles.title, { flex: 1 }]}>Ispirazioni per il prossimo viaggio</Text>
        {/* Solo in sviluppo: rilegge subito il database ignorando la cache */}
        {__DEV__ && (
          <TouchableOpacity onPress={handleDevRefresh} hitSlop={8} activeOpacity={0.6}>
            <Ionicons name="refresh-circle" size={22} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>
      {/* Categorie */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.scrollView}
      >
        {[{ id: 'all' as const, label: 'Tutte', icon: 'apps-outline' }, ...availableCategories].map((category) => {
          const active = filter === category.id
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(category.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={category.icon as any} size={14} color={active ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{category.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        // Si estende fino ai bordi del foglio (che ha 16 di padding)
        style={styles.scrollView}
      >
        {visibleIdeas.map((idea) => (
          <IdeaCard idea={idea} key={idea.id} onPress={() => setSelected(idea)} />
        ))}
      </ScrollView>
      <TripIdeaModal idea={selected} onClose={() => setSelected(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginTop: 26, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  title: { fontSize: 12.5, fontWeight: '800', color: '#4B5563', letterSpacing: 0.5, textTransform: 'uppercase' },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#FF5A5F', borderColor: '#FF5A5F' },
  chipText: { fontSize: 12.5, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },
  scrollView: { marginHorizontal: -16 },
  scroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  cardShadow: {
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderRadius: 16,
  },
  card: {
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  photo: { flex: 1, backgroundColor: '#CBD5E1' },
  // Bordo bianco e ombra: la bandiera si stacca dalla foto
  flagBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 1.5,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
  },
  city: { fontSize: 18, fontWeight: '800', color: '#111827' },
  tagline: { fontSize: 11.5, fontWeight: '500', color: '#64748B', marginTop: 1 },
  daysPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  daysText: { fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' },
})

export default TripIdeas
