import React, { useState, useEffect, useCallback } from 'react'
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
} from 'react-native'
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

const BarcodeLines = () => {
  const bars = [2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 3, 2]
  return (
    <View style={styles.barcodeContainer}>
      {bars.map((w, i) => (
        <View
          key={i}
          style={{
            width: w,
            height: 18,
            backgroundColor: '#CBD5E1',
            marginRight: 2.2,
          }}
        />
      ))}
    </View>
  )
}

// Card primaria per il viaggio in corso (versione verticale)
const OngoingTripCard = ({ trip }: Props) => {
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

  const startDay = new Date(startDate).setHours(0, 0, 0, 0)
  const endDay = new Date(endDate).setHours(23, 59, 59, 999)
  const todayStart = new Date(now).setHours(0, 0, 0, 0)

  const totalDays = Math.max(1, Math.round((endDay - startDay) / (1000 * 3600 * 24)))
  const elapsedDays = Math.floor((now.getTime() - startDay) / (1000 * 3600 * 24))
  const currentDayNumber = Math.min(totalDays, Math.max(1, elapsedDays + 1))

  const msPerDay = 1000 * 3600 * 24
  const daysLeft = Math.max(
    0,
    Math.round((new Date(endDate).setHours(0, 0, 0, 0) - todayStart) / msPerDay)
  )

  // La card primaria vale anche per il prossimo viaggio, quando non ce n'è uno in corso
  const isUpcoming = now.getTime() < startDay
  const daysToStart = Math.max(1, Math.round((startDay - todayStart) / msPerDay))

  const startFormatted = format(startDate, 'dd MMM', { locale: it }).toUpperCase()
  const endFormatted = format(endDate, 'dd MMM', { locale: it }).toUpperCase()
  const stepsCount = trip.steps?.length || 0

  return (
    <>
      <TouchableOpacity
        style={[
          styles.cardShadowWrapper,
          { shadowColor: countryTheme.accentColor },
        ]}
        onPress={handleTripCardClick}
        activeOpacity={0.92}
      >
        <View style={styles.cardContainer}>
          {/* Top Half: Boarding Pass Header (Country Flag Gradient) */}
          <ThemeBackground countryCode={trip.country?.id} colors={countryTheme.gradient} style={styles.topSection}>
            {/* Header Row: Live Pass Label & Serial */}
            <View style={styles.passHeaderRow}>
              <View style={styles.passLabelRow}>
                <View style={styles.pulsingBeacon} />
                <Text style={styles.passLabelText}>
                  {isUpcoming ? 'BOARDING PASS • PROSSIMO VIAGGIO' : 'BOARDING PASS • IN VIAGGIO'}
                </Text>
                {isShared(trip) && <Ionicons name="people" size={13} color="rgba(255, 255, 255, 0.9)" />}
              </View>
              <Text style={styles.passSerial}>TRIP #{trip.id}</Text>
            </View>

            {/* Main Destination Showcase */}
            <View style={styles.destinationRow}>
              <View style={styles.cityWrapper}>
                <Text style={styles.cityName} numberOfLines={1}>
                  {trip.city.toUpperCase()}
                </Text>
                <Text style={styles.countryName}>
                  {trip.country?.title?.toUpperCase() || ''}
                </Text>
              </View>
              <View style={styles.flagCircle}>
                <CountryFlag countryCode={trip.country.id} height={38} isCircle />
              </View>
            </View>

            {/* Flight / Travel Route Timeline */}
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <Text style={styles.routeDateText}>{startFormatted}</Text>
                <Text style={styles.routeSubText}>PARTENZA</Text>
              </View>

              <View style={styles.routeLineWrapper}>
                <View style={styles.routeLine} />
                <View style={styles.airplaneCircle}>
                  <Ionicons
                    name="airplane"
                    size={13}
                    color={countryTheme.accentColor}
                  />
                </View>
              </View>

              <View style={[styles.routePoint, { alignItems: 'flex-end' }]}>
                <Text style={styles.routeDateText}>{endFormatted}</Text>
                <Text style={styles.routeSubText}>RITORNO</Text>
              </View>
            </View>
          </ThemeBackground>

          {/* Notched Tear Line Divider */}
          <View style={styles.notchRow}>
            <View style={styles.notchLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.notchRight} />
          </View>

          {/* Bottom Half: Ticket Stub with Bold Typographic Stats (NO CHIPS!) */}
          <View style={styles.bottomSection}>
            <View style={styles.statsGrid}>
              {/* Stat 1: Current Day */}
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>{isUpcoming ? totalDays : `${currentDayNumber}°`}</Text>
                <Text style={styles.statLabel}>
                  {isUpcoming ? (totalDays === 1 ? 'GIORNO DI VIAGGIO' : 'GIORNI DI VIAGGIO') : `DI ${totalDays} GIORNI`}
                </Text>
              </View>

              <View style={styles.statDivider} />

              {/* Stat 2: Days Remaining (Focal Point styled with Flag Accent!) */}
              <View style={styles.statCol}>
                <Text
                  style={[
                    styles.statNumber,
                    { color: countryTheme.accentColor },
                  ]}
                >
                  {isUpcoming ? (daysToStart === 1 ? 'DOMANI' : daysToStart) : daysLeft === 0 ? 'OGGI' : daysLeft}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: countryTheme.accentColor },
                  ]}
                >
                  {isUpcoming
                    ? daysToStart === 1
                      ? 'SI PARTE'
                      : 'GIORNI ALLA PARTENZA'
                    : daysLeft === 0
                    ? 'ULTIMO GIORNO'
                    : daysLeft === 1
                    ? 'GIORNO RIMASTO'
                    : 'GIORNI RIMASTI'}
                </Text>
              </View>

              <View style={styles.statDivider} />

              {/* Stat 3: Steps Count */}
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>{stepsCount}</Text>
                <Text style={styles.statLabel}>
                  {stepsCount === 1 ? 'TAPPA' : 'TAPPE TOTALI'}
                </Text>
              </View>
            </View>

            {/* Bottom Barcode Strip & CTA */}
            <View style={styles.footerRow}>
              {/* Interactive Barcode Button for Tickets */}
              <TouchableOpacity
                style={styles.barcodeInteractiveBtn}
                onPress={(e) => {
                  e.stopPropagation?.()
                  setTicketsModalVisible(true)
                }}
                activeOpacity={0.78}
              >
                <BarcodeLines />
                <View
                  style={[
                    styles.barcodeOverlayBadge,
                    tickets.length > 0 && {
                      backgroundColor: hexToRgba(countryTheme.accentColor, 0.12),
                      borderColor: hexToRgba(countryTheme.accentColor, 0.35),
                    },
                  ]}
                >
                  <Ionicons
                    name={tickets.length > 0 ? 'ticket' : 'add-circle'}
                    size={12}
                    color={tickets.length > 0 ? countryTheme.accentColor : '#4F46E5'}
                  />
                  <Text
                    style={[
                      styles.barcodeBadgeText,
                      tickets.length > 0 && { color: countryTheme.accentColor },
                    ]}
                  >
                    {tickets.length === 0
                      ? 'Biglietti'
                      : `${tickets.length} ${tickets.length === 1 ? 'pass' : 'pass'}`}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.openCtaRow}>
                <Text
                  style={[
                    styles.openCtaText,
                    { color: countryTheme.accentColor },
                  ]}
                >
                  Itinerario
                </Text>
                <Ionicons
                  name="arrow-forward-circle"
                  size={18}
                  color={countryTheme.accentColor}
                />
              </View>
            </View>
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

// Su Android Inter risulta più largo del font di sistema iOS: riduco leggermente i testi
// Su Android riduco gli spazi verticali della card
const vs = (size: number) => (Platform.OS === 'android' ? Math.round(size * 0.7) : size)
const fs = (size: number) => (Platform.OS === 'android' ? Math.round(size * 0.9 * 2) / 2 : size)

const styles = StyleSheet.create({
  cardShadowWrapper: {
    width: '100%',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    borderRadius: 22,
  },
  cardContainer: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    overflow: 'hidden',
  },
  topSection: {
    paddingHorizontal: 18,
    paddingTop: vs(16),
    paddingBottom: vs(16),
    gap: vs(12),
  },
  passHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pulsingBeacon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  passLabelText: {
    fontSize: fs(10.5),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  passSerial: {
    fontSize: fs(10.5),
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.5,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cityWrapper: {
    flex: 1,
  },
  cityName: {
    fontSize: fs(30),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  countryName: {
    fontSize: fs(12),
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  flagCircle: {
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    paddingVertical: vs(9),
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 2,
  },
  routePoint: {
    minWidth: 65,
  },
  routeDateText: {
    fontSize: fs(13),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  routeSubText: {
    fontSize: fs(9),
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  routeLineWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 12,
  },
  routeLine: {
    width: '100%',
    height: 1,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
  },
  airplaneCircle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  // La riga è a cavallo del confine tra le due sezioni (10 px sopra e 10 sotto): linea e tacche cadono esattamente lì
  notchRow: {
    height: 20,
    marginTop: -10,
    marginBottom: -10,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  notchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    marginLeft: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  notchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    marginRight: -10,
  },
  bottomSection: {
    paddingHorizontal: 18,
    paddingTop: vs(26),
    paddingBottom: vs(16),
    gap: vs(12),
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: fs(26),
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.6,
  },
  statHighlight: {
    color: '#FF5A5F',
  },
  statLabel: {
    fontSize: fs(9.5),
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  statHighlightLabel: {
    color: '#E11D48',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F1F5F9',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeInteractiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 7,
  },
  barcodeOverlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  barcodeBadgeText: {
    fontSize: fs(10.5),
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.2,
  },
  openCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  openCtaText: {
    fontSize: fs(12.5),
    fontWeight: '800',
    color: '#FF5A5F',
    letterSpacing: 0.2,
  },
})

export default OngoingTripCard
