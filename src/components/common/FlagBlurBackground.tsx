import React, { useEffect } from 'react'
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { tiltX, tiltY, subscribeTilt } from '../../utils/tiltStore'

interface Props {
  countryCode?: string
  // Colore mostrato mentre la bandiera si carica
  fallbackColor: string
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
  // Intensità della sfocatura
  blur?: number
  // Quanto scurire lo sfondo (0-1) per far risaltare il testo bianco
  tint?: number
}

// Effetto parallasse con l'inclinazione del telefono
const PARALLAX_ENABLED = true
// Margine dell'immagine oltre il riquadro (fa da riserva per il movimento)
const IMAGE_MARGIN = 24
// Di quanti pixel si sposta la bandiera con l'inclinazione massima (deve restare sotto IMAGE_MARGIN)
const PARALLAX_SHIFT = 12

// Sfondo ottenuto dalla bandiera del paese, ingrandita e molto sfocata: le strisce si fondono in sfumature morbide.
// Inclinando il telefono la bandiera si sposta leggermente (parallasse).
const FlagBlurBackground = ({ countryCode, fallbackColor, style, children, blur = 20, tint = 0.18 }: Props) => {
  useEffect(() => {
    if (!PARALLAX_ENABLED) return
    return subscribeTilt()
  }, [])

  const translateX = tiltX.interpolate({ inputRange: [-1, 1], outputRange: [PARALLAX_SHIFT, -PARALLAX_SHIFT] })
  const translateY = tiltY.interpolate({ inputRange: [-1, 1], outputRange: [PARALLAX_SHIFT * 0.7, -PARALLAX_SHIFT * 0.7] })

  return (
    <View style={[{ backgroundColor: fallbackColor, overflow: 'hidden' }, style]}>
      {!!countryCode && (
        <Animated.Image
          source={{ uri: `https://flagcdn.com/w320/${countryCode.toLowerCase()}.webp` }}
          blurRadius={blur}
          resizeMode="cover"
          // Più grande del riquadro: la sfocatura sbiadisce i bordi dell'immagine e il movimento non scopre mai il fondo
          style={{
            position: 'absolute',
            top: -IMAGE_MARGIN,
            left: -IMAGE_MARGIN,
            right: -IMAGE_MARGIN,
            bottom: -IMAGE_MARGIN,
            transform: PARALLAX_ENABLED ? [{ translateX }, { translateY }] : undefined,
          }}
        />
      )}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0, 0, 0, ${tint})` }]} />
      {children}
    </View>
  )
}

export default FlagBlurBackground
