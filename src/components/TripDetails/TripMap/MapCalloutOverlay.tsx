import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Animated, LayoutChangeEvent, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export interface OverlayRegion {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export interface MapCalloutOverlayRef {
  // isFinal = false mentre la mappa si muove (onRegionChange), true a movimento concluso (onRegionChangeComplete)
  setRegion: (region: OverlayRegion, isFinal?: boolean) => void
  // Il dito ha iniziato a trascinare la mappa: nascondo subito il fumetto
  beginMove: () => void
}

interface Target {
  lat: number
  lng: number
  title: string
  address?: string
}

interface Props {
  initialRegion: OverlayRegion
  target: Target | null
  onDirections: () => void
  onClose?: () => void
}

const BUBBLE_WIDTH = 248
const ACTION_WIDTH = 52
const ACTION_ICON_SIZE = 20
// Il glifo "navigate" ha il peso visivo spostato in alto a destra: lo riporto al centro (~6% della dimensione)
const ACTION_ICON_NUDGE = { x: -ACTION_ICON_SIZE * 0.06, y: ACTION_ICON_SIZE * 0.065 }
const SIDE_MARGIN = 8
// Distanza tra la coordinata (punta del pin) e il fondo del fumetto: altezza del pin (~30) più uno spazio.
// I valori tengono conto del pin selezionato, più grande del 25% (SELECTED_PIN_SCALE in TripMap).
// Su iOS l'ancora del marker non viene applicata come su Android: il pin è centrato sulla coordinata invece di
// avere la punta sopra di essa, quindi la sua cima sta a ~15 px dalla coordinata e serve molto meno spazio.
const PIN_OFFSET = Platform.OS === 'ios' ? 24 : 44
// Margine trasparente in alto e a sinistra: serve perché il pulsante di chiusura sporge dal fumetto ma deve restare
// dentro l'area della vista (su Android i tocchi fuori dai bordi del genitore non arrivano)
const OUTER_PAD = 10
// Distanza dalla coordinata quando il fumetto è sotto il pin. Su iOS il pin si estende ~14 px sotto la coordinata
// (vedi PIN_OFFSET), quindi serve più spazio per non coprirlo.
const BELOW_GAP = Platform.OS === 'ios' ? 28 : 8

const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))

// Fumetto del pin disegnato come vista React sopra la mappa (invece del callout nativo):
// segue il pin durante gli spostamenti, si anima e ha un pulsante toccabile.
const MapCalloutOverlay = forwardRef<MapCalloutOverlayRef, Props>(({ initialRegion, target, onDirections, onClose }, ref) => {
  const [region, setRegion] = useState<OverlayRegion>(initialRegion)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [bubbleHeight, setBubbleHeight] = useState(64)
  // 0 = fumetto nascosto, 1 = visibile. Gli eventi di regione arrivano dal JS con qualche ms di ritardo e il fumetto
  // non resterebbe agganciato al pin, quindi lo nascondo mentre la mappa si muove e lo ripropongo a movimento concluso.
  const visible = useRef(new Animated.Value(0)).current
  const isShownRef = useRef(false)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const waitingFinalRef = useRef(false)

  const show = () => {
    if (isShownRef.current) return
    isShownRef.current = true
    visible.stopAnimation()
    Animated.timing(visible, { toValue: 1, duration: 180, useNativeDriver: false }).start()
  }

  const hide = (animated: boolean) => {
    if (!isShownRef.current && !animated) return
    isShownRef.current = false
    visible.stopAnimation()
    if (animated) {
      Animated.timing(visible, { toValue: 0, duration: 40, useNativeDriver: false }).start()
    } else {
      visible.setValue(0)
    }
  }

  const clearFallback = () => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    fallbackTimerRef.current = null
  }

  useImperativeHandle(
    ref,
    () => ({
      beginMove: () => {
        if (isShownRef.current) hide(true)
      },
      setRegion: (r, isFinal = true) => {
        if (!isFinal) {
          // Mappa in movimento: nascondo (una volta sola), la posizione la aggiorno solo alla fine
          if (isShownRef.current) hide(true)
          if (waitingFinalRef.current) {
            // La mappa si sta muovendo davvero: aspetto l'evento finale (con un limite di sicurezza)
            clearFallback()
            fallbackTimerRef.current = setTimeout(() => {
              waitingFinalRef.current = false
              show()
            }, 2000)
          }
          return
        }
        clearFallback()
        waitingFinalRef.current = false
        setRegion(r)
        if (targetKeyRef.current) show()
      },
    }),
    []
  )

  // Nuova selezione: resto nascosto finché la mappa non finisce di muoversi (evita il "compare, sparisce, riappare").
  // Se la mappa non si muove affatto, dopo un attimo mostro comunque il fumetto.
  const targetKey = target ? `${target.lat}_${target.lng}` : null
  const targetKeyRef = useRef<string | null>(targetKey)
  targetKeyRef.current = targetKey
  useEffect(() => {
    clearFallback()
    hide(false)
    if (!targetKey) return
    waitingFinalRef.current = true
    fallbackTimerRef.current = setTimeout(() => {
      waitingFinalRef.current = false
      show()
    }, 700)
    return clearFallback
  }, [targetKey])

  if (!target || size.width === 0) {
    return <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout)} />
  }

  const topLat = region.latitude + region.latitudeDelta / 2
  const bottomLat = region.latitude - region.latitudeDelta / 2
  const x = ((target.lng - (region.longitude - region.longitudeDelta / 2)) / region.longitudeDelta) * size.width
  const y =
    ((mercatorY(topLat) - mercatorY(target.lat)) / (mercatorY(topLat) - mercatorY(bottomLat))) * size.height

  // Pin fuori dalla zona visibile: niente fumetto (resterebbe sospeso a mezz'aria)
  const isPinOffscreen = x < 0 || x > size.width || y < 0 || y > size.height
  if (isPinOffscreen) {
    return <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout)} />
  }

  const left = Math.min(Math.max(x - BUBBLE_WIDTH / 2, SIDE_MARGIN), size.width - BUBBLE_WIDTH - SIDE_MARGIN)
  const innerHeight = bubbleHeight - OUTER_PAD
  // Di norma sopra il pin; se in alto non c'è spazio lo metto sotto la punta, se non basta nemmeno lì lo tengo nei bordi
  const aboveTop = y - PIN_OFFSET - innerHeight
  const belowTop = y + BELOW_GAP
  let bubbleTop = aboveTop
  if (aboveTop < SIDE_MARGIN) {
    bubbleTop = belowTop + innerHeight <= size.height - SIDE_MARGIN ? belowTop : SIDE_MARGIN
  }
  const top = bubbleTop - OUTER_PAD

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout)}
    >
      <Animated.View
        onLayout={(e: LayoutChangeEvent) => setBubbleHeight(e.nativeEvent.layout.height)}
        style={[
          styles.outer,
          {
            left: left - OUTER_PAD,
            top,
            opacity: visible,
            transform: [{ translateY: visible.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
          },
        ]}
      >
        <View style={styles.bubble}>
        <View style={styles.row}>
          <View style={styles.texts}>
            <Text style={styles.title} numberOfLines={2}>
              {target.title}
            </Text>
            {!!target.address && (
              <Text style={styles.address} numberOfLines={2}>
                {target.address}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.action} onPress={onDirections} activeOpacity={0.8}>
            <Ionicons
              name="navigate"
              size={ACTION_ICON_SIZE}
              color="white"
              style={{ transform: [{ translateX: ACTION_ICON_NUDGE.x }, { translateY: ACTION_ICON_NUDGE.y }] }}
            />
          </TouchableOpacity>
        </View>
        </View>
        {!!onClose && (
          <TouchableOpacity style={styles.close} onPress={onClose} activeOpacity={0.8} hitSlop={8}>
            <Ionicons name="close" size={13} color="#475569" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  )
})

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    paddingTop: OUTER_PAD,
    paddingLeft: OUTER_PAD,
  },
  bubble: {
    width: BUBBLE_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
  // Riga interna con overflow nascosto: il pulsante a destra segue gli angoli arrotondati del fumetto
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
  },
  texts: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 10,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  address: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748B',
  },
  action: {
    width: ACTION_WIDTH,
    backgroundColor: 'tomato',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: Platform.OS === 'android' ? 7 : 0,
  },
})

export default MapCalloutOverlay
