import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, ViewStyle } from 'react-native'

// Segnaposto grigi che pulsano mentre i viaggi si caricano
const Block = ({ style, pulse }: { style: ViewStyle; pulse: Animated.Value }) => (
  <Animated.View style={[styles.block, style, { opacity: pulse }]} />
)

const TripsSkeleton = () => {
  const pulse = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 800, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <View style={styles.container}>
      {/* Card principale */}
      <View style={styles.hero}>
        <Block pulse={pulse} style={{ width: '45%', height: 12 }} />
        <Block pulse={pulse} style={{ width: '65%', height: 26 }} />
        <Block pulse={pulse} style={{ width: '90%', height: 12 }} />
      </View>

      {/* Titolo di sezione */}
      <Block pulse={pulse} style={{ width: 130, height: 12, marginTop: 6 }} />

      {/* Altre card */}
      {[0, 1].map((i) => (
        <View key={i} style={styles.card}>
          <Block pulse={pulse} style={{ width: 36, height: 36, borderRadius: 18 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Block pulse={pulse} style={{ width: '60%', height: 14 }} />
            <Block pulse={pulse} style={{ width: '40%', height: 10 }} />
          </View>
          <Block pulse={pulse} style={{ width: 54, height: 22, borderRadius: 11 }} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 14, paddingTop: 4 },
  block: { backgroundColor: '#E2E8F0', borderRadius: 8 },
  hero: {
    height: 126,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    padding: 16,
    justifyContent: 'space-between',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 76,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    paddingHorizontal: 14,
  },
})

export default TripsSkeleton
