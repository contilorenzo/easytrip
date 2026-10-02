import React from 'react'
import { Trip } from '../types'
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ROUTES } from '../../common/db/routes'
import { useTripsContext } from '../../../state/TripsContext'
import CountryFlag from '../../common/CountryFlag/CountryFlag'
import { useFlagTheme, hexToRgba } from '../../../utils/countryTheme'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  trip: Trip
  variant?: 'upcoming' | 'past'
  isFinished?: boolean
}

const TripCard = ({ trip, variant, isFinished = false }: Props) => {
  const context = useTripsContext()
  const countryTheme = useFlagTheme(trip.country?.id)

  const handleTripCardClick = () => {
    context.setCurrentTrip(trip)
    router.push(ROUTES.TRIP_DETAILS)
  }

  const startDate = new Date(trip.startDate)
  const endDate = new Date(trip.endDate)
  const now = new Date()

  const startDay = new Date(startDate).setHours(0, 0, 0, 0)
  const endDay = new Date(endDate).setHours(23, 59, 59, 999)
  const nowDay = new Date(now).setHours(12, 0, 0, 0)

  const isPast = isFinished || variant === 'past' || now.getTime() > endDay
  let statusLabel = ''

  if (isPast) {
    const diffDays = Math.max(1, Math.round((nowDay - endDay) / (1000 * 3600 * 24)))
    statusLabel = diffDays === 1 ? 'Ieri' : `${diffDays} gg fa`
  } else {
    const diffDays = Math.round((startDay - nowDay) / (1000 * 3600 * 24))
    if (diffDays <= 0) statusLabel = 'Oggi!'
    else if (diffDays === 1) statusLabel = 'Domani'
    else statusLabel = `Tra ${diffDays} gg`
  }

  // Duration in days
  const durationDays = Math.max(
    1,
    Math.round((endDay - startDay) / (1000 * 3600 * 24))
  )

  // Formatted date range
  const isSameYear = startDate.getFullYear() === endDate.getFullYear()
  const dateRangeText = isSameYear
    ? `${format(startDate, 'd MMM', { locale: it })} — ${format(endDate, 'd MMM yyyy', { locale: it })}`
    : `${format(startDate, 'd MMM yyyy', { locale: it })} — ${format(endDate, 'd MMM yyyy', { locale: it })}`

  const stepsCount = trip.steps?.length || 0

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        !isPast && {
          shadowColor: countryTheme.accentColor,
          shadowOpacity: 0.12,
        },
        isPast && styles.cardContainerPast,
      ]}
      onPress={handleTripCardClick}
      activeOpacity={0.84}
    >
      <View style={styles.cardInnerContainer}>
        {/* Top Flag Gradient Stripe */}
        <LinearGradient
          colors={
            isPast
              ? (countryTheme.gradient.map(c => hexToRgba(c, 0.45)) as [string, string, ...string[]])
              : countryTheme.gradient
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.topGradientBar, isPast && styles.topGradientBarPast]}
        />

        {/* Card content with subtle background wash */}
        <LinearGradient
          colors={
            isPast
              ? ['#FAFAFA', '#F8FAFC']
              : ['#FFFFFF', '#FFFFFF', hexToRgba(countryTheme.gradient[0], 0.04)]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardContent}
        >
          {/* Top row: Flag + City + Country, and Gradient Status Badge */}
          <View style={styles.topRow}>
            <View style={styles.destinationGroup}>
              <View style={[styles.flagWrapper, isPast && styles.flagWrapperPast]}>
                <CountryFlag countryCode={trip.country.id} height={26} isCircle />
              </View>
              <View style={styles.titleWrapper}>
                <Text
                  style={[styles.cityName, isPast && styles.cityNamePast]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {trip.city}
                </Text>
                {trip.country?.title && (
                  <Text style={styles.countryName} numberOfLines={1}>
                    {trip.country.title}
                  </Text>
                )}
              </View>
            </View>

            {/* Gradient Status badge */}
            {!isPast ? (
              <LinearGradient
                colors={countryTheme.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientStatusBadge}
              >
                <Ionicons name="time-outline" size={11} color="#FFFFFF" style={{ marginRight: 3.5 }} />
                <Text style={styles.gradientStatusText}>
                  {statusLabel}
                </Text>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={[
                  hexToRgba(countryTheme.gradient[0], 0.12),
                  hexToRgba(countryTheme.gradient[countryTheme.gradient.length - 1] || countryTheme.gradient[0], 0.06),
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pastStatusBadge}
              >
                <Ionicons
                  name="checkmark-done"
                  size={11}
                  color={countryTheme.accentColor}
                  style={{ marginRight: 3.5 }}
                />
                <Text style={[styles.pastStatusText, { color: countryTheme.accentColor }]}>
                  {statusLabel}
                </Text>
              </LinearGradient>
            )}
          </View>

          {/* Subtle Divider */}
          <View style={styles.cardDivider} />

          {/* Footer row: Dates, Duration, Steps, Arrow */}
          <View style={styles.footerRow}>
            <View style={styles.dateGroup}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={isPast ? '#9CA3AF' : '#6B7280'}
              />
              <Text style={[styles.dateText, isPast && styles.dateTextPast]}>
                {dateRangeText}
              </Text>
              <Text style={styles.durationBadge}>
                ({durationDays} {durationDays === 1 ? 'giorno' : 'gg'})
              </Text>
            </View>

            <View style={styles.rightGroup}>
              {stepsCount > 0 && (
                <View style={[styles.stepsBadge, isPast && styles.stepsBadgePast]}>
                  <Ionicons
                    name="location"
                    size={11}
                    color={isPast ? '#9CA3AF' : '#64748B'}
                  />
                  <Text style={[styles.stepsText, isPast && styles.stepsTextPast]}>
                    {stepsCount} {stepsCount === 1 ? 'tappa' : 'tappe'}
                  </Text>
                </View>
              )}
              <View style={styles.chevronWrapper}>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={isPast ? '#CBD5E1' : countryTheme.accentColor}
                />
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContainerPast: {
    shadowOpacity: 0.02,
    elevation: 1,
  },
  cardInnerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  topGradientBar: {
    width: '100%',
    height: 5,
  },
  topGradientBarPast: {
    height: 3.5,
  },
  cardContent: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  destinationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  flagWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    borderRadius: 5,
  },
  flagWrapperPast: {
    opacity: 0.85,
  },
  titleWrapper: {
    flex: 1,
  },
  cityName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  cityNamePast: {
    color: '#475569',
  },
  countryName: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 1,
  },
  gradientStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  gradientStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  pastStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pastStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  dateText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  dateTextPast: {
    color: '#64748B',
  },
  durationBadge: {
    fontSize: 11.5,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  stepsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    gap: 3.5,
  },
  stepsBadgePast: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  stepsText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  stepsTextPast: {
    color: '#94A3B8',
  },
  chevronWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default TripCard
