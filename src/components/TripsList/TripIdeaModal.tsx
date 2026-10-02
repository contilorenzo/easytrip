import React from 'react'
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CountryFlag from '../common/CountryFlag/CountryFlag'
import ThemeBackground from '../common/ThemeBackground'
import { useFlagTheme } from '../../utils/countryTheme'
import { ROUTES } from '../common/db/routes'
import { IDEA_CATEGORIES, TripIdea } from '../../services/tripIdeas'

interface Props {
  idea: TripIdea | null
  onClose: () => void
}

// Dettaglio di un'idea di viaggio: descrizione, tappe proposte e pulsante per crearlo
const TripIdeaModal = ({ idea, onClose }: Props) => {
  const insets = useSafeAreaInsets()
  const theme = useFlagTheme(idea?.countryId)

  const handleCreate = () => {
    if (!idea) return
    onClose()
    // Apre "Nuovo viaggio" già compilato con città, paese, durata e tappe proposte
    router.push({ pathname: ROUTES.NEW_TRIP, params: { city: idea.city, country: idea.countryId, days: String(idea.days), idea: idea.id } })
  }

  return (
    <Modal visible={!!idea} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {idea && (
        <View style={styles.screen}>
          <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
            {/* Foto (o bandiera sfocata) */}
            <View style={styles.photo}>
              {idea.imageUrl ? (
                <Image source={{ uri: idea.imageUrl }} style={StyleSheet.absoluteFill} />
              ) : (
                <ThemeBackground countryCode={idea.countryId} colors={theme.gradient} style={StyleSheet.absoluteFill} />
              )}
              <View style={styles.flagBadge}>
                <CountryFlag countryCode={idea.countryId} height={30} isCircle resolution="w80" />
              </View>
            </View>

            <View style={styles.body}>
              <Text style={styles.country}>
                {idea.countryName.toUpperCase()}
                {IDEA_CATEGORIES.find((category) => category.id === idea.category) ? ` · ${IDEA_CATEGORIES.find((category) => category.id === idea.category)?.label.toUpperCase()}` : ''}
              </Text>
              <Text style={styles.city}>{idea.city}</Text>
              <View style={styles.daysPill}>
                <Ionicons name="calendar-outline" size={13} color="#FF5A5F" />
                <Text style={styles.daysText}>{idea.days} giorni consigliati</Text>
              </View>

              {!!idea.intro && <Text style={styles.intro}>{idea.intro}</Text>}
              {!idea.intro && !!idea.tagline && <Text style={styles.intro}>{idea.tagline}</Text>}

              {idea.itinerary.length > 0 ? (
                <View style={styles.stops}>
                  <Text style={styles.sectionLabel}>PROGRAMMA PROPOSTO</Text>
                  {idea.itinerary.map((step, index) => (
                    <View key={`${step.placeName}-${index}`}>
                      {step.day !== idea.itinerary[index - 1]?.day && <Text style={styles.dayLabel}>GIORNO {step.day}</Text>}
                      <View style={styles.stopRow}>
                        <View style={[styles.stopNumber, step.type === 'food' && styles.stopFood]}>
                          <Ionicons name={step.type === 'food' ? 'restaurant' : 'location'} size={13} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stopName}>{step.title}</Text>
                          <Text style={styles.stopTime}>
                            {String(step.startHour).padStart(2, '0')}:{String(step.startMinute).padStart(2, '0')} · {step.durationMinutes} min
                          </Text>
                          {!!step.description && <Text style={styles.stopDescription}>{step.description}</Text>}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                idea.attractions.length > 0 && (
                  <View style={styles.stops}>
                    <Text style={styles.sectionLabel}>TAPPE PROPOSTE</Text>
                    {idea.attractions.map((stop, index) => (
                      <View key={`${stop.name}-${index}`} style={styles.stopRow}>
                        <View style={styles.stopNumber}>
                          <Text style={styles.stopNumberText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stopName}>{stop.name}</Text>
                          {!!stop.description && <Text style={styles.stopDescription}>{stop.description}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )
              )}

              <Text style={styles.credit}>Fonte: Wikivoyage (CC BY-SA), programma organizzato con AI</Text>
            </View>
          </ScrollView>

          {/* Chiudi */}
          <TouchableOpacity
            style={[styles.closeButton, { top: Platform.OS === 'android' ? insets.top + 10 : 14 }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Pulsante sempre visibile */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <TouchableOpacity style={styles.createButton} onPress={handleCreate} activeOpacity={0.85}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createText}>Crea questo viaggio</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FA' },
  photo: { height: 240, backgroundColor: '#CBD5E1' },
  flagBadge: {
    position: 'absolute',
    left: 18,
    bottom: -16,
    padding: 1.5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  body: { paddingHorizontal: 18, paddingTop: 28, gap: 10 },
  country: { fontSize: 11.5, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8 },
  city: { fontSize: 30, fontWeight: '800', color: '#111827' },
  daysPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  daysText: { fontSize: 12.5, fontWeight: '700', color: '#FF5A5F' },
  intro: { fontSize: 14.5, lineHeight: 21, color: '#374151', marginTop: 6 },
  stops: { marginTop: 14, gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5 },
  stopRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stopNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stopNumberText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  dayLabel: { fontSize: 11.5, fontWeight: '800', color: '#FF5A5F', letterSpacing: 0.6, marginTop: 6, marginBottom: 8 },
  stopFood: { backgroundColor: '#F59E0B' },
  stopTime: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginTop: 1 },
  stopName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  stopDescription: { fontSize: 13, lineHeight: 18, color: '#64748B', marginTop: 2 },
  credit: { fontSize: 11, color: '#94A3B8', marginTop: 18 },
  closeButton: {
    position: 'absolute',
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: 'rgba(248,249,250,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createButton: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FF5A5F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
})

export default TripIdeaModal
