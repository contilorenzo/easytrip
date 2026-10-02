import React, { useState, useMemo } from 'react'
import {
  Text,
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import TripCard from './TripCard/TripCard'
import OngoingTripCard from './TripCard/OngoingTripCard'
import UpcomingTripCard from './TripCard/UpcomingTripCard'
import { createTripsTable, formatTrips, loadTrips } from '../common/db/utils'
import { Trip } from './types'
import { useFocusEffect } from 'expo-router'
import { mockTrips } from '../../../mocks/trips'
import { useTripsContext } from '../../state/TripsContext'
import { Ionicons } from '@expo/vector-icons'
import TripsSkeleton from './TripsSkeleton'
import JoinTripForm from '../Account/JoinTripForm'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type FilterType = 'ALL' | 'UPCOMING' | 'PAST'

const TripsList = () => {
  const context = useTripsContext()
  const [isPastAccordionOpen, setIsPastAccordionOpen] = useState(false)
  // Vero finché non è terminato il primo caricamento dei viaggi
  const [isLoading, setIsLoading] = useState(context.trips.length === 0)

  useFocusEffect(
    React.useCallback(() => {
      context.setCurrentTrip(null as any)

      const fetchData = async () => {
        try {
          if (context.trips.length === 0) {
            if (Platform.OS !== 'web') {
              await createTripsTable()
              await loadTrips(context)
            } else {
              context.setTrips(formatTrips(mockTrips))
            }
          }
        } finally {
          setIsLoading(false)
        }
      }

      fetchData()
    }, [])
  )

  const { ongoingTrips, upcomingTrips, pastTrips } = useMemo(() => {
    const now = new Date()

    const ongoing: Trip[] = []
    const upcoming: Trip[] = []
    const past: Trip[] = []

    context.trips.forEach((trip) => {
      const startDay = new Date(trip.startDate).setHours(0, 0, 0, 0)
      const endDay = new Date(trip.endDate).setHours(23, 59, 59, 999)

      if (now.getTime() >= startDay && now.getTime() <= endDay) {
        ongoing.push(trip)
      } else if (now.getTime() < startDay) {
        upcoming.push(trip)
      } else {
        past.push(trip)
      }
    })

    // Sort upcoming ascending (nearest first)
    upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    // Sort past descending (most recent past first)
    past.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())

    return { ongoingTrips: ongoing, upcomingTrips: upcoming, pastTrips: past }
  }, [context.trips])

  const totalTripsCount = context.trips.length

  const handleTogglePastAccordion = () => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    }
    setIsPastAccordionOpen((prev) => !prev)
  }

  if (isLoading && totalTripsCount === 0) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.listContainer}>
          <TripsSkeleton />
        </View>
      </View>
    )
  }

  if (totalTripsCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="compass-outline" size={44} color="tomato" />
        </View>
        <Text style={styles.emptyTitle}>Nessun viaggio programmato</Text>
        <Text style={styles.emptySubtitle}>
          Il mondo ti aspetta! Inizia ad organizzare la tua prossima avventura creando un viaggio.
        </Text>
        <View style={styles.joinWrapper}>
          <JoinTripForm />
        </View>
      </View>
    )
  }

  const renderSectionHeader = (
    title: string,
    iconName: any,
    count: number,
    dotColor?: string,
    badgeBg?: string,
    badgeTextColor?: string
  ) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {dotColor ? (
          <View style={[styles.sectionDot, { backgroundColor: dotColor }]} />
        ) : (
          <Ionicons name={iconName} size={15} color="#4B5563" />
        )}
        <Text style={styles.sectionTitleText}>{title}</Text>
      </View>
      <View style={[styles.countBadge, badgeBg ? { backgroundColor: badgeBg } : undefined]}>
        <Text
          style={[
            styles.countBadgeText,
            badgeTextColor ? { color: badgeTextColor } : undefined,
          ]}
        >
          {count}
        </Text>
      </View>
    </View>
  )

  const showOngoing = ongoingTrips.length > 0
  const showUpcoming = upcomingTrips.length > 0
  const showPast = pastTrips.length > 0

  return (
    <View style={styles.wrapper}>
      <View style={styles.listContainer}>
        {/* Section 1: Ongoing Trips (Hero Card with internal badge) */}
        {showOngoing && (
          <View style={styles.cardsStack}>
            {/* In corso: card verticale */}
            {ongoingTrips.map((trip) => (
              <OngoingTripCard trip={trip} key={trip.id} />
            ))}
          </View>
        )}

        {/* Section 2: Upcoming Trips (Secondary Relevance) */}
        {showUpcoming && (
          <View style={styles.sectionBlock}>
            {renderSectionHeader(
              'PROSSIMI VIAGGI',
              'airplane-outline',
              upcomingTrips.length,
              '#FF5A5F'
            )}
            <View style={styles.cardsStack}>
              {/* Prossimi viaggi: card orizzontale a boarding pass */}
              {upcomingTrips.map((trip) => (
                <UpcomingTripCard trip={trip} key={trip.id} />
              ))}
            </View>
          </View>
        )}

        {/* Nessun viaggio in programma: form per il codice invito */}
        {!showOngoing && !showUpcoming && <JoinTripForm />}

        {/* Section 3: viaggi passati, sezione a sé separata da una linea (si apre/chiude toccando l'intestazione) */}
        {showPast && (
          <View style={styles.pastSection}>
            <View style={styles.pastDivider} />
            <TouchableOpacity
              style={styles.pastHeader}
              onPress={handleTogglePastAccordion}
              activeOpacity={0.6}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time-outline" size={15} color="#94A3B8" />
                <Text style={[styles.sectionTitleText, { color: '#94A3B8' }]}>VIAGGI PASSATI</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{pastTrips.length}</Text>
                </View>
              </View>
              <View style={styles.pastToggle}>
                <Text style={styles.pastToggleText}>{isPastAccordionOpen ? 'Nascondi' : 'Mostra'}</Text>
                <Ionicons name={isPastAccordionOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            {isPastAccordionOpen && (
              <View style={styles.accordionContent}>
                {pastTrips.map((trip) => (
                  <TripCard trip={trip} key={trip.id} variant="past" isFinished />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  joinWrapper: { alignSelf: 'stretch', marginTop: 24 },
  wrapper: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 24,
  },
  listContainer: {
    width: '100%',
    gap: 22,
  },
  sectionBlock: {
    width: '100%',
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5A5F',
  },
  sectionTitleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#374151',
  },
  cardsStack: {
    width: '100%',
    gap: 12,
  },
  pastSection: {
    width: '100%',
    marginTop: 14,
    gap: 12,
  },
  pastDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  pastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  pastToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pastToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  accordionContent: {
    marginTop: 4,
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
})

export default TripsList
