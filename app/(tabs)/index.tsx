import React, { useRef, useCallback } from 'react'
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AddNewTripButton from '../../src/components/AddNewTrip/AddNewTripButton'
import TripsList from '../../src/components/TripsList/TripsList'
import TripIdeas from '../../src/components/TripsList/TripIdeas'
import AccountButton from '../../src/components/Account/AccountButton'
import { useTripsContext } from '../../src/state/TripsContext'
import { Stack } from 'expo-router'

// The scroll threshold (px) after which the sticky header fully appears
const STICKY_THRESHOLD = 80

const HomeScreen = () => {
  const { trips } = useTripsContext()
  const insets = useSafeAreaInsets()

  const scrollY = useRef(new Animated.Value(0)).current

  const stickyOpacity = scrollY.interpolate({
    inputRange: [0, STICKY_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const stickyTranslateY = scrollY.interpolate({
    inputRange: [0, STICKY_THRESHOLD],
    outputRange: [-20, 0],
    extrapolate: 'clamp',
  })

  const heroLogoOpacity = scrollY.interpolate({
    inputRange: [0, STICKY_THRESHOLD * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const handleScroll = useCallback(
    Animated.event<NativeSyntheticEvent<NativeScrollEvent>>(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: true }
    ),
    []
  )

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        {/* Section 1: Hero Banner with Primary Gradient */}
        <LinearGradient
          colors={['#E11D48', '#FF5A5F', '#FF7A59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroGradient, { paddingTop: insets.top + 52 }]}
        >
          {/* ── Brand Logo + Tagline Section ── */}
          <Animated.View style={[styles.logoSection, { opacity: heroLogoOpacity }]}>
            <Animated.Image
              source={require('../../assets/easytrips-logo-white.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Plan it, live it - your trips, made easy ✈️</Text>
          </Animated.View>

          {/* Primary CTA Card */}
          <AddNewTripButton isFirstTrip={trips.length === 0} />
        </LinearGradient>

        {/* Section 2: Content Canvas Sheet with White Cards */}
        <View style={styles.bodySheet}>
          <TripsList />
          <TripIdeas />
        </View>
      </Animated.ScrollView>

      {/* ─── Sticky Header (appears on scroll) ─── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top,
            height: insets.top + 52,
            opacity: stickyOpacity,
            transform: [{ translateY: stickyTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={['#C0122F', '#E11D48', '#EF4060']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { opacity: 0.97 }]}
        />
        <Image
          source={require('../../assets/easytrips-logo-white.png')}
          style={styles.stickyLogo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Account / stato sincronizzazione */}
      <View style={[styles.accountButtonWrapper, { top: insets.top + 8 }]}>
        <AccountButton />
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroGradient: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
    marginBottom: 6,
    gap: 5,
  },
  brandLogo: {
    height: 44,
    width: 210,
    opacity: 0.96,
  },
  tagline: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.72)',
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  bodySheet: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -18,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
    flex: 1,
  },
  accountButtonWrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 50,
  },
  // ── Sticky header ──
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    overflow: 'hidden',
  },
  stickyLogo: {
    height: 26,
    width: 130,
    opacity: 0.96,
  },
})

export default HomeScreen
