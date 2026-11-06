import React, { ReactNode } from 'react'
import { Platform, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'

interface Props {
  onPress?: () => void
  children: ReactNode
  size?: number
  // Aspetto di riserva (iOS prima del 26 e Android): su sfondi colorati, su sfondi chiari o grigio scuro (mappe)
  variant?: 'onDark' | 'onLight' | 'slate' | 'map'
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable()

// Pulsante tondo: liquid glass interattivo su iOS 26, altrimenti un cerchio semitrasparente
const GlassButton = ({ onPress, children, size = 38, variant = 'onDark', style, accessibilityLabel }: Props) => {
  const shape = { width: size, height: size, borderRadius: size / 2 }

  if (glassAvailable) {
    return (
      <GlassView isInteractive glassEffectStyle="regular" style={[shape, style]}>
        <TouchableOpacity style={[styles.fill, shape]} onPress={onPress} activeOpacity={0.7} accessibilityLabel={accessibilityLabel}>
          {children}
        </TouchableOpacity>
      </GlassView>
    )
  }

  return (
    <TouchableOpacity
      style={[styles.fill, shape, variant === 'onDark' ? styles.onDark : variant === 'slate' ? styles.slate : variant === 'map' ? styles.map : styles.onLight, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fill: { alignItems: 'center', justifyContent: 'center' },
  onDark: { backgroundColor: 'rgba(255, 255, 255, 0.22)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.45)' },
  // Bianco con ombra, come i pulsanti sopra le mappe
  map: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  slate: { backgroundColor: 'rgba(30, 41, 59, 0.75)' },
  onLight: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
})

// Pulsante rettangolare arrotondato (es. "Condividi"): vetro su iOS 26; altrimenti `fallbackStyle` (sfondo, ombra) si somma a `style`
export const GlassTouchable = ({
  children,
  onPress,
  style,
  fallbackStyle,
  borderRadius = 12,
  activeOpacity = 0.8,
}: {
  children: ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  fallbackStyle?: StyleProp<ViewStyle>
  borderRadius?: number
  activeOpacity?: number
}) =>
  glassAvailable ? (
    <GlassView isInteractive glassEffectStyle="regular" style={{ borderRadius }}>
      <TouchableOpacity style={style} onPress={onPress} activeOpacity={activeOpacity}>
        {children}
      </TouchableOpacity>
    </GlassView>
  ) : (
    <TouchableOpacity style={[style, fallbackStyle]} onPress={onPress} activeOpacity={activeOpacity}>
      {children}
    </TouchableOpacity>
  )

// Contenitore a pillola (es. selettore del giorno): vetro su iOS 26, altrimenti lo stile di riserva passato in `fallbackStyle`
export const GlassPill = ({ children, style, fallbackStyle }: { children: ReactNode; style?: StyleProp<ViewStyle>; fallbackStyle?: StyleProp<ViewStyle> }) =>
  glassAvailable ? (
    <GlassView isInteractive glassEffectStyle="regular" style={style}>
      {children}
    </GlassView>
  ) : (
    <View style={[style, fallbackStyle]}>{children}</View>
  )

export { glassAvailable }
export default GlassButton
