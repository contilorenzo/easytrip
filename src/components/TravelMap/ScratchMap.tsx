import React, { memo, useRef } from 'react'
import { Animated, Easing, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Circle, G, Path } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import GlassButton from '../common/GlassButton'
import worldMap from '../../assets/worldMapPaths.json'

export interface MapPalette {
  background: string
  land: string
  border: string
  visited: string
  upcoming: string
}

export const MAP_PALETTES: Record<'dark' | 'light', MapPalette> = {
  // Mappa nera da parete: confini sottili, paesi visitati in oro
  dark: { background: '#050506', land: '#0E0E12', border: '#52525E', visited: '#FF6347', upcoming: '#38BDF8' },
  light: { background: '#FFFFFF', land: '#FFFFFF', border: '#CBD5E1', visited: '#FF6347', upcoming: '#0EA5E9' },
}

interface Props {
  width: number
  visited: Set<string>
  upcoming: Set<string>
  palette: MapPalette
  // Altezza della cornice (di default 0,9 volte la larghezza)
  height?: number
  initialScale?: number
  // Paese evidenziato e callback al tocco su un paese (null = tocco sul mare o fuori da un paese)
  selectedCode?: string | null
  onSelectCountry?: (code: string | null) => void
  // Chiamata quando un gesto sulla mappa inizia/finisce: serve a bloccare lo scorrimento della pagina
  onInteractionChange?: (active: boolean) => void
  // Se presente compare il pulsante a schermo intero
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
  // Distanza dei pulsanti dal bordo inferiore (a schermo intero tiene conto della barra di sistema)
  controlsBottom?: number
}

const MAX_SCALE = 6
// La mappa viene disegnata UNA volta a questa risoluzione (3 volte la larghezza dello schermo) e poi solo ingrandita/spostata:
// nessun ridisegno durante zoom e trascinamento, quindi niente scatti né sfarfallii. Oltre questo zoom diventa un po' morbida.
const RENDER_ZOOM = 3
const MIN_SCALE = 1
const DEFAULT_INITIAL_SCALE = 1.6
// Il mondo parte centrato su Europa/Africa (circa 15° est)
const INITIAL_CENTER = 0.5 + 15 / 360

type Dot = { code: string; x: number; y: number }

// Inquadratura della mappa: zoom e spostamento (in pixel) rispetto al centro
interface View2D {
  scale: number
  x: number
  y: number
}

// Geometrie derivate dai tracciati (pallini dei paesi minuscoli e poligoni per il tocco). Sono ricalcolate se i dati
// della mappa cambiano (es. dopo aver rigenerato il file con Fast Refresh), così non restano allineate a una vecchia mappa
let geometry: { source: unknown; dots: Dot[]; polygons: { code: string; rings: number[][][] }[] } | null = null

const getGeometry = () => {
  if (geometry && geometry.source === worldMap.countries) return geometry

  // Paesi minuscoli (Malta, Singapore…) non si vedrebbero: li segno con un pallino
  const dots: Dot[] = worldMap.countries
    .map(({ code, d }) => {
      const numbers = (d.match(/-?\d+\.?\d*/g) ?? []).map(Number)
      const xs = numbers.filter((_, i) => i % 2 === 0)
      const ys = numbers.filter((_, i) => i % 2 === 1)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      return { code, size: Math.max(maxX - minX, maxY - minY), x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
    })
    .filter((country) => country.size < 5)
    .map(({ code, x, y }) => ({ code, x, y }))

  // Poligoni dei paesi per capire quale è stato toccato
  const polygons = worldMap.countries.map(({ code, d }) => ({
    code,
    rings: d
      .split('Z')
      .filter(Boolean)
      .map((ring) => {
        const numbers = (ring.match(/-?\d+\.?\d*/g) ?? []).map(Number)
        const points: number[][] = []
        for (let i = 0; i + 1 < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]])
        return points
      }),
  }))

  geometry = { source: worldMap.countries, dots, polygons }
  return geometry
}

const insideRing = (x: number, y: number, ring: number[][]) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Paese nel punto (x, y) delle coordinate del disegno; `tolerance` allarga i paesi minuscoli
const countryAt = (x: number, y: number, tolerance: number): string | null => {
  const { dots, polygons } = getGeometry()
  for (const dot of dots) {
    if (Math.hypot(dot.x - x, dot.y - y) <= tolerance) return dot.code
  }
  for (const { code, rings } of polygons) {
    if (rings.some((ring) => insideRing(x, y, ring))) return code
  }
  return null
}

// Il disegno dei paesi: si ridisegna solo se cambiano colori, paesi o selezione (mai durante zoom e trascinamento)
const MapPaths = memo(({ width, height, visited, upcoming, palette, selectedCode }: { width: number; height: number; visited: Set<string>; upcoming: Set<string>; palette: MapPalette; selectedCode?: string | null }) => (
  <Svg width={width} height={height} viewBox={`0 0 ${worldMap.width} ${worldMap.height}`}>
    <G stroke={palette.border} strokeWidth={0.5} strokeLinejoin="round">
      {worldMap.countries.map(({ code, d }) => (
        <Path
          key={code}
          d={d}
          fill={visited.has(code) ? palette.visited : upcoming.has(code) ? palette.upcoming : palette.land}
        />
      ))}
    </G>
    {/* Paese selezionato: contorno chiaro sopra gli altri */}
    {selectedCode && (
      <Path
        d={worldMap.countries.find((country) => country.code === selectedCode)?.d ?? ''}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1}
        strokeLinejoin="round"
      />
    )}
    {getGeometry()
      .dots.filter((dot) => visited.has(dot.code) || upcoming.has(dot.code))
      .map((dot) => (
        <Circle
          key={dot.code}
          cx={dot.x}
          cy={dot.y}
          r={3.5}
          fill={visited.has(dot.code) ? palette.visited : palette.upcoming}
          stroke={palette.border}
          strokeWidth={0.5}
        />
      ))}
  </Svg>
))

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// Mappa del mondo a tutta larghezza con zoom (pizzico o pulsanti) e trascinamento.
// Il disegno è fisso e molto grande: zoom e spostamento sono solo trasformazioni (fluide, senza ridisegnare).
const ScratchMap = ({
  width,
  visited,
  upcoming,
  palette,
  height,
  initialScale = DEFAULT_INITIAL_SCALE,
  selectedCode,
  onSelectCountry,
  onInteractionChange,
  onToggleFullscreen,
  isFullscreen,
  controlsBottom = 10,
}: Props) => {
  const mapHeight = (width * worldMap.height) / worldMap.width
  const frameHeight = height ?? Math.round(width * 0.9)

  const initialView: View2D = {
    scale: initialScale,
    x: initialScale > 1 ? -(INITIAL_CENTER - 0.5) * width * initialScale : 0,
    y: 0,
  }
  const live = useRef<View2D>(initialView) // inquadratura attuale

  // Valori che muovono il disegno (la scala è relativa alla dimensione "grande" del disegno)
  const scaleValue = useRef(new Animated.Value(initialView.scale / RENDER_ZOOM)).current
  const translateX = useRef(new Animated.Value(initialView.x)).current
  const translateY = useRef(new Animated.Value(initialView.y)).current

  const clampView = (view: View2D): View2D => {
    const s = clamp(view.scale, MIN_SCALE, MAX_SCALE)
    const maxX = (width * s - width) / 2
    const maxY = Math.max(0, (mapHeight * s - frameHeight) / 2)
    return { scale: s, x: clamp(view.x, -maxX, maxX), y: clamp(view.y, -maxY, maxY) }
  }

  const show = (view: View2D) => {
    const next = clampView(view)
    live.current = next
    scaleValue.setValue(next.scale / RENDER_ZOOM)
    translateX.setValue(next.x)
    translateY.setValue(next.y)
  }

  const gesture = useRef({ touches: 0, dx: 0, dy: 0, view: initialView, distance: 1 })
  const frameRef = useRef<React.ElementRef<typeof View>>(null)
  const frameOrigin = useRef({ x: 0, y: 0 })
  const tapStart = useRef({ x: 0, y: 0, time: 0 })
  // Un gesto è un tocco solo se resta fermo, con un dito, e non interrompe uno zoom in corso
  const touchInfo = useRef({ multi: false, moved: 0, interrupted: false })
  const callbacks = useRef({ onSelectCountry, onInteractionChange })
  callbacks.current = { onSelectCountry, onInteractionChange }

  // Zoom dei pulsanti: animato
  const zoomAnimation = useRef<Animated.CompositeAnimation | null>(null)

  const distanceBetween = (touches: readonly any[]) =>
    Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY)

  // Tocco: converte il punto sullo schermo nelle coordinate del disegno e cerca il paese
  const handleTap = (pageX: number, pageY: number) => {
    const view = live.current
    const pixelsPerUnit = (view.scale * width) / worldMap.width
    const px = pageX - frameOrigin.current.x
    const py = pageY - frameOrigin.current.y
    const x = worldMap.width / 2 - view.x / pixelsPerUnit + (px - width / 2) / pixelsPerUnit
    const y = worldMap.height / 2 - view.y / pixelsPerUnit + (py - frameHeight / 2) / pixelsPerUnit
    // Circa 14 pixel di tolleranza per i paesi minuscoli
    callbacks.current.onSelectCountry?.(countryAt(x, y, 14 / pixelsPerUnit))
  }

  const panResponder = useRef(
    PanResponder.create({
      // La mappa prende tutti i gesti: la pagina non deve scorrere mentre la si usa
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        gesture.current.touches = 0
        touchInfo.current = { multi: false, moved: 0, interrupted: !!zoomAnimation.current }
        if (zoomAnimation.current) {
          // Uno zoom animato in corso viene portato subito a termine
          zoomAnimation.current.stop()
          zoomAnimation.current = null
          show(live.current)
        }
        tapStart.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY, time: Date.now() }
        frameRef.current?.measureInWindow((x, y) => {
          frameOrigin.current = { x, y }
        })
        callbacks.current.onInteractionChange?.(true)
      },
      onPanResponderMove: (evt, g) => {
        const touches = evt.nativeEvent.touches
        const count = Math.min(touches.length, 2)
        const current = gesture.current
        if (touches.length >= 2) touchInfo.current.multi = true
        touchInfo.current.moved = Math.max(touchInfo.current.moved, Math.hypot(g.dx, g.dy))
        // Se cambia il numero di dita riparto da qui, così la mappa non salta
        if (count !== current.touches) {
          current.touches = count
          current.dx = g.dx
          current.dy = g.dy
          current.view = { ...live.current }
          current.distance = count === 2 ? distanceBetween(touches) : 1
        }
        const scale = count === 2 ? current.view.scale * (distanceBetween(touches) / current.distance) : current.view.scale
        show({ scale, x: current.view.x + (g.dx - current.dx), y: current.view.y + (g.dy - current.dy) })
      },
      onPanResponderRelease: () => {
        callbacks.current.onInteractionChange?.(false)
        const info = touchInfo.current
        const isTap = !info.multi && !info.interrupted && info.moved < 6 && Date.now() - tapStart.current.time < 350
        if (isTap) handleTap(tapStart.current.x, tapStart.current.y)
      },
      onPanResponderTerminate: () => callbacks.current.onInteractionChange?.(false),
    })
  ).current

  const zoomBy = (factor: number) => {
    zoomAnimation.current?.stop()
    const next = clampView({ scale: live.current.scale * factor, x: live.current.x * factor, y: live.current.y * factor })
    live.current = next
    const config = { duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }
    const animation = Animated.parallel([
      Animated.timing(scaleValue, { toValue: next.scale / RENDER_ZOOM, ...config }),
      Animated.timing(translateX, { toValue: next.x, ...config }),
      Animated.timing(translateY, { toValue: next.y, ...config }),
    ])
    zoomAnimation.current = animation
    animation.start(({ finished }) => {
      if (finished) zoomAnimation.current = null
    })
  }

  // Dimensione del disegno: RENDER_ZOOM volte la mappa, centrato nella cornice
  const bigWidth = width * RENDER_ZOOM
  const bigHeight = mapHeight * RENDER_ZOOM

  return (
    <View ref={frameRef} collapsable={false} style={[styles.frame, { width, height: frameHeight, backgroundColor: palette.background }]} {...panResponder.panHandlers}>
      <Animated.View
        renderToHardwareTextureAndroid
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: (width - bigWidth) / 2,
          top: (frameHeight - bigHeight) / 2,
          width: bigWidth,
          height: bigHeight,
          transform: [{ translateX }, { translateY }, { scale: scaleValue }],
        }}
      >
        <MapPaths width={bigWidth} height={bigHeight} visited={visited} upcoming={upcoming} palette={palette} selectedCode={selectedCode} />
      </Animated.View>

      {/* Zoom e schermo intero (liquid glass su iOS 26) */}
      <View style={[styles.controls, { bottom: controlsBottom }]} pointerEvents="box-none">
        {onToggleFullscreen && (
          <GlassButton size={34} variant="slate" onPress={onToggleFullscreen} accessibilityLabel="Schermo intero">
            <Ionicons name={isFullscreen ? 'contract-outline' : 'expand-outline'} size={16} color="#FFFFFF" />
          </GlassButton>
        )}
        <GlassButton size={34} variant="slate" onPress={() => zoomBy(1.6)} accessibilityLabel="Ingrandisci">
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </GlassButton>
        <GlassButton size={34} variant="slate" onPress={() => zoomBy(1 / 1.6)} accessibilityLabel="Riduci">
          <Ionicons name="remove" size={18} color="#FFFFFF" />
        </GlassButton>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Mappa piatta a tutta larghezza, senza angoli arrotondati
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // In fila lungo il bordo inferiore, a destra
  controls: { position: 'absolute', left: 0, right: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  control: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default ScratchMap
