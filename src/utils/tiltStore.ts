import { AccessibilityInfo, Animated, AppState } from 'react-native'
import { DeviceMotion } from 'expo-sensors'

// Inclinazione del telefono, condivisa da tutte le card: due valori animati tra -1 e 1
// (x = inclinazione a destra/sinistra, y = in avanti/indietro) rispetto alla posizione in cui si tiene il telefono.
// Il sensore resta acceso solo finché c'è almeno una card che lo usa e l'app è in primo piano.
export const tiltX = new Animated.Value(0)
export const tiltY = new Animated.Value(0)

const UPDATE_INTERVAL_MS = 50
// Inclinazione (in radianti, circa 20°) che porta il valore a 1
const FULL_TILT_RAD = 0.35
// Quanto in fretta la posizione "neutra" segue il modo in cui si tiene il telefono (0-1, più basso = più lento)
const NEUTRAL_FOLLOW = 0.015
// Smorzamento del movimento (0-1, più basso = più morbido)
const SMOOTHING = 0.25

let users = 0
let subscription: { remove: () => void } | null = null
let appStateSubscription: { remove: () => void } | null = null

let neutral: { beta: number; gamma: number } | null = null
let currentX = 0
let currentY = 0

const clamp = (value: number) => Math.max(-1, Math.min(1, value))

const startSensor = async () => {
  if (subscription) return
  try {
    if (await AccessibilityInfo.isReduceMotionEnabled()) return
    if (!(await DeviceMotion.isAvailableAsync())) return
    DeviceMotion.setUpdateInterval(UPDATE_INTERVAL_MS)
    subscription = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation) return
      const { beta, gamma } = rotation
      if (!neutral) neutral = { beta, gamma }
      // La posizione neutra si sposta lentamente verso quella attuale: conta l'inclinazione rispetto a come si tiene il telefono
      neutral.beta += (beta - neutral.beta) * NEUTRAL_FOLLOW
      neutral.gamma += (gamma - neutral.gamma) * NEUTRAL_FOLLOW

      const targetX = clamp((gamma - neutral.gamma) / FULL_TILT_RAD)
      const targetY = clamp((beta - neutral.beta) / FULL_TILT_RAD)
      currentX += (targetX - currentX) * SMOOTHING
      currentY += (targetY - currentY) * SMOOTHING
      tiltX.setValue(currentX)
      tiltY.setValue(currentY)
    })
  } catch {
    // sensore non disponibile: l'effetto semplicemente non c'è
  }
}

const stopSensor = () => {
  subscription?.remove()
  subscription = null
  neutral = null
}

// Chiamare all'inizio dell'uso; restituisce la funzione da chiamare alla fine
export const subscribeTilt = (): (() => void) => {
  users += 1
  if (users === 1) {
    startSensor()
    appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') startSensor()
      else stopSensor()
    })
  }

  return () => {
    users -= 1
    if (users === 0) {
      stopSensor()
      appStateSubscription?.remove()
      appStateSubscription = null
    }
  }
}
