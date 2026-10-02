import React, { useState, useEffect, useCallback } from 'react'
import { Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native'
import ThemeBackground from '../../common/ThemeBackground'
import { isShared } from '../../../utils/tripRole'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { router } from 'expo-router'
import { Trip } from '../types'
import { ROUTES } from '../../common/db/routes'
import { useTripsContext } from '../../../state/TripsContext'
import CountryFlag from '../../common/CountryFlag/CountryFlag'
import { useFlagTheme, hexToRgba } from '../../../utils/countryTheme'
import { getTripTickets, TripTicket } from '../../../utils/tripTickets'
import TripTicketsModal from './TripTicketsModal'

interface Props {
  trip: Trip
}

const STUB_WIDTH = 112

// Finto codice a barre decorativo del talloncino
const BarcodeLines = () => {
  const bars = [2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1]
  return (
    <View style={styles.barcodeContainer}>
      {bars.map((w, i) => (
        <View key={i} style={{ width: w, height: 11, backgroundColor: '#CBD5E1', marginRight: 1.8 }} />
      ))}
    </View>
  )
}
const NOTCH_SIZE = 18
const DASHES = 9

// Card primaria per il prossimo viaggio, a forma di boarding pass orizzontale: corpo colorato a sinistra e talloncino staccabile a destra
const UpcomingTripCard = ({ trip }: Props) => {
  const context = useTripsContext()
  const countryTheme = useFlagTheme(trip.country?.id)
  const [tickets, setTickets] = useState<TripTicket[]>([])
  const [ticketsModalVisible, setTicketsModalVisible] = useState(false)

  const loadTickets = useCallback(async () => {
    try {
      const items = await getTripTickets(trip.id)
      setTickets(items)
    } catch (err) {
      console.error('Error loading tickets for trip', trip.id, err)
    }
  }, [trip.id])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const handleTripCardClick = () => {
    context.setCurrentTrip(trip)
    router.push(ROUTES.TRIP_DETAILS)
  }

  const startDate = new Date(trip.startDate)
  const endDate = new Date(trip.endDate)
  const now = new Date()
  const msPerDay = 1000 * 3600 * 24

  const startDay = new Date(startDate).setHours(0, 0, 0, 0)
  const endDay = new Date(endDate).setHours(23, 59, 59, 999)
  const todayStart = new Date(now).setHours(0, 0, 0, 0)

  const totalDays = Math.max(1, Math.round((endDay - startDay) / msPerDay))
  const elapsedDays = Math.floor((now.getTime() - startDay) / msPerDay)
  const currentDayNumber = Math.min(totalDays, Math.max(1, elapsedDays + 1))
  const daysLeft = Math.max(0, Math.round((new Date(endDate).setHours(0, 0, 0, 0) - todayStart) / msPerDay))

  // Vale anche per il prossimo viaggio, quando non ce n'è uno in corso
  const isUpcoming = now.getTime() < startDay
  const daysToStart = Math.max(1, Math.round((startDay - todayStart) / msPerDay))

  const stepsCount = trip.steps?.length || 0

  const startFormatted = format(startDate, 'dd MMM', { locale: it }).toUpperCase()
  const endFormatted = format(endDate, 'dd MMM', { locale: it }).toUpperCase()

  // Numero in evidenza nel talloncino
  // Per i viaggi futuri il conto è alla rovescia: "-12 GIORNI"
  const stubNumber = isUpcoming ? `-${daysToStart}` : daysLeft === 0 ? 'OGGI' : String(daysLeft)
  const stubLabel = isUpcoming
    ? daysToStart === 1
      ? 'GIORNO'
      : 'GIORNI'
    : daysLeft === 0
    ? 'ULTIMO GIORNO'
    : daysLeft === 1
    ? 'GIORNO RIMASTO'
    : 'GIORNI RIMASTI'

  const headerLabel = isUpcoming
    ? `PROSSIMO · ${totalDays} ${totalDays === 1 ? 'GIORNO' : 'GIORNI'}`
    : `IN VIAGGIO · GIORNO ${currentDayNumber}/${totalDays}`

  return (
    <>
      <TouchableOpacity
        style={styles.cardShadowWrapper}
        onPress={handleTripCardClick}
        activeOpacity={0.92}
      >
        <View style={styles.cardContainer}>
          {/* Corpo del biglietto */}
          <ThemeBackground countryCode={trip.country?.id} colors={countryTheme.gradient} style={styles.mainSection}>
            <View style={styles.topRow}>
              <View style={styles.labelRow}>
                <View style={styles.beacon} />
                <Text style={styles.labelText} numberOfLines={1}>
                  {headerLabel}
                </Text>
                {isShared(trip) && <Ionicons name="people" size={13} color="rgba(255, 255, 255, 0.9)" />}
              </View>
              <View style={styles.flagCircle}>
                <CountryFlag countryCode={trip.country.id} height={26} isCircle />
              </View>
            </View>

            <View>
              <Text style={styles.cityName} numberOfLines={1}>
                {trip.city.toUpperCase()}
              </Text>
              <Text style={styles.countryName} numberOfLines={1}>
                {trip.country?.title?.toUpperCase() || ''}
              </Text>
            </View>

            <View style={styles.routeRow}>
              <Text style={styles.routeDate}>{startFormatted}</Text>
              <View style={styles.routeLineWrapper}>
                <View style={styles.routeLine} />
                <View style={styles.airplaneCircle}>
                  <Ionicons name="airplane" size={11} color={countryTheme.accentColor} />
                </View>
              </View>
              <Text style={styles.routeDate}>{endFormatted}</Text>
            </View>
          </ThemeBackground>

          {/* Linea di strappo con le tacche */}
          <View style={styles.tearColumn} pointerEvents="none">
            {Array.from({ length: DASHES }).map((_, i) => (
              <View key={i} style={styles.dash} />
            ))}
          </View>
          <View style={[styles.notch, { top: -NOTCH_SIZE / 2, right: STUB_WIDTH - NOTCH_SIZE / 2 }]} />
          <View style={[styles.notch, { bottom: -NOTCH_SIZE / 2, right: STUB_WIDTH - NOTCH_SIZE / 2 }]} />

          {/* Talloncino */}
          <View style={styles.stub}>
            <View style={styles.stubTop}>
              <Text style={[styles.stubNumber, { color: countryTheme.accentColor }]} numberOfLines={1} adjustsFontSizeToFit>
                {stubNumber}
              </Text>
              <Text style={[styles.stubLabel, { color: countryTheme.accentColor }]} numberOfLines={2}>
                {stubLabel}
              </Text>
            </View>

            <View style={styles.stepsRow}>
              <Ionicons name="location" size={12} color="#64748B" />
              <Text style={styles.stepsText}>
                {stepsCount} {stepsCount === 1 ? 'tappa' : 'tappe'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.barcodeButton}
              onPress={(e) => {
                e.stopPropagation?.()
                setTicketsModalVisible(true)
              }}
              activeOpacity={0.78}
            >
              <BarcodeLines />
              <View
                style={[
                  styles.barcodeBadge,
                  tickets.length > 0 && {
                    backgroundColor: hexToRgba(countryTheme.accentColor, 0.12),
                    borderColor: hexToRgba(countryTheme.accentColor, 0.35),
                  },
                ]}
              >
                <Ionicons
                  name={tickets.length > 0 ? 'ticket' : 'add-circle'}
                  size={11}
                  color={tickets.length > 0 ? countryTheme.accentColor : '#4F46E5'}
                />
                <Text style={[styles.barcodeBadgeText, tickets.length > 0 && { color: countryTheme.accentColor }]}>
                  {tickets.length === 0 ? 'Biglietti' : `${tickets.length} pass`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

      </TouchableOpacity>

      <TripTicketsModal
        visible={ticketsModalVisible}
        onClose={() => setTicketsModalVisible(false)}
        trip={trip}
        tickets={tickets}
        onTicketsChanged={loadTickets}
        countryTheme={countryTheme}
      />
    </>
  )
}

// Su Android riduco leggermente testi e spazi verticali
const fs = (size: number) => (Platform.OS === 'android' ? Math.round(size * 0.9 * 2) / 2 : size)

const styles = StyleSheet.create({
  // Ombra compatta e ben definita (raggio piccolo, poco sfumata)
  cardShadowWrapper: {
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 4,
    borderRadius: 12,
  },
  cardContainer: {
    flexDirection: 'row',
    height: Platform.OS === 'android' ? 118 : 126,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  mainSection: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  beacon: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  labelText: {
    fontSize: fs(9.5),
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 1,
  },
  flagCircle: {
    padding: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  cityName: {
    fontSize: fs(22),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  countryName: {
    fontSize: fs(10.5),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.82)',
    letterSpacing: 1,
    marginTop: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDate: {
    fontSize: fs(11.5),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  routeLineWrapper: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  airplaneCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tearColumn: {
    position: 'absolute',
    top: NOTCH_SIZE / 2 + 2,
    bottom: NOTCH_SIZE / 2 + 2,
    right: STUB_WIDTH - 1,
    width: 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dash: {
    width: 2,
    height: 5,
    borderRadius: 1,
    backgroundColor: '#CBD5E1',
  },
  // Cerchi con il colore dello sfondo della pagina: tagliati dal bordo diventano le tacche del biglietto
  notch: {
    position: 'absolute',
    width: NOTCH_SIZE,
    height: NOTCH_SIZE,
    borderRadius: NOTCH_SIZE / 2,
    backgroundColor: '#F8F9FA',
  },
  stub: {
    width: STUB_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 7,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stubTop: {
    alignItems: 'center',
    gap: 1,
    width: '100%',
  },
  stubNumber: {
    fontSize: fs(24),
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  stubLabel: {
    fontSize: fs(8.5),
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepsText: {
    fontSize: fs(11),
    fontWeight: '800',
    color: '#475569',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeButton: {
    alignItems: 'center',
    gap: 3.5,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  barcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  barcodeBadgeText: {
    fontSize: fs(10),
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.2,
  },
})

export default UpcomingTripCard
