import React, { useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { Polyline } from 'react-native-maps'
import { smoothPath } from '../../../utils/smoothPath'

// Il disegno animato dei percorsi si fa solo su iOS: su Android ridisegnare la linea a ogni passo fa laggare,
// quindi lì i percorsi compaiono subito per intero
export const ROUTE_ANIMATION_ENABLED = Platform.OS === 'ios'

interface Props {
  coordinates: { latitude: number; longitude: number }[]
  color: string
  // Spostamento per distinguere i percorsi di giorni diversi che passano per gli stessi punti
  offset: number
  duration?: number
  // Attesa prima di cominciare a disegnare (per disegnare più percorsi uno dopo l'altro)
  delay?: number
}

// L'animazione si adatta al dispositivo: l'avanzamento dipende dal tempo trascorso, mentre l'intervallo minimo tra un
// ridisegno della linea e il successivo si allarga se i fotogrammi sono lenti e si restringe se il telefono regge.
const MIN_INTERVAL_MS = 33 // al massimo ~30 ridisegni al secondo
const MAX_INTERVAL_MS = 200 // sui telefoni più lenti scende a ~5 ridisegni al secondo
const SLOW_FRAME_MS = 34 // fotogramma medio più lento di così (< ~30 fps): rallento i ridisegni
const FAST_FRAME_MS = 22 // più veloce di così (> ~45 fps): posso tornare a ridisegnare più spesso

// Percorso che si "disegna" dal primo all'ultimo punto invece di comparire di colpo.
// Lo stato è locale a questo componente, così a ogni passo non si ridisegna tutta la mappa.
const AnimatedRoute = ({ coordinates, color, offset, duration = 2000, delay = 0 }: Props) => {
  // Curve addolcite e spostamento si calcolano una volta sola
  const shiftedAll = useMemo(
    () => smoothPath(coordinates).map((c) => ({ latitude: c.latitude + offset, longitude: c.longitude + offset })),
    [coordinates, offset]
  )

  // Lunghezza cumulata del percorso: l'avanzamento segue i metri e non il numero di punti, che dopo la
  // semplificazione sono pochi sui rettilinei e tanti nelle curve (altrimenti i tratti dritti comparirebbero di colpo)
  const { cumulative, totalLength } = useMemo(() => {
    const lngScale = Math.cos((shiftedAll[0]?.latitude ?? 0) * (Math.PI / 180))
    const cumulative: number[] = [0]
    for (let i = 1; i < shiftedAll.length; i++) {
      const dLat = shiftedAll[i].latitude - shiftedAll[i - 1].latitude
      const dLng = (shiftedAll[i].longitude - shiftedAll[i - 1].longitude) * lngScale
      cumulative.push(cumulative[i - 1] + Math.sqrt(dLat * dLat + dLng * dLng))
    }
    return { cumulative, totalLength: cumulative[cumulative.length - 1] ?? 0 }
  }, [shiftedAll])

  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    let frame: number | null = null
    setStarted(false)
    setProgress(0)

    const start = () => {
      setStarted(true)
      if (!ROUTE_ANIMATION_ENABLED || shiftedAll.length < 3 || totalLength === 0) {
        setProgress(1)
        return
      }

      const startedAt = Date.now()
      let lastFrameAt = startedAt
      let lastUpdateAt = 0
      let averageFrameMs = 16
      let minInterval = MIN_INTERVAL_MS

      const tick = () => {
        const now = Date.now()

        // Misuro quanto passa tra un fotogramma e l'altro (include il costo dei ridisegni precedenti) e adatto l'intervallo
        averageFrameMs = averageFrameMs * 0.8 + (now - lastFrameAt) * 0.2
        lastFrameAt = now
        if (averageFrameMs > SLOW_FRAME_MS) minInterval = Math.min(MAX_INTERVAL_MS, minInterval * 1.25)
        else if (averageFrameMs < FAST_FRAME_MS) minInterval = Math.max(MIN_INTERVAL_MS, minInterval * 0.9)

        const t = Math.min(1, (now - startedAt) / duration)
        if (t >= 1 || now - lastUpdateAt >= minInterval) {
          lastUpdateAt = now
          setProgress(1 - Math.pow(1 - t, 2))
        }

        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    const startTimer = setTimeout(start, Math.max(0, delay))
    return () => {
      clearTimeout(startTimer)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [shiftedAll, totalLength, duration])

  // Parte visibile: tutti i punti fino alla lunghezza raggiunta, più un punto interpolato che fa avanzare la punta con continuità
  const visible = useMemo(() => {
    if (progress >= 1) return shiftedAll
    const target = progress * totalLength
    let index = 1
    while (index < cumulative.length - 1 && cumulative[index] < target) index++
    const segmentLength = cumulative[index] - cumulative[index - 1]
    const ratio = segmentLength > 0 ? (target - cumulative[index - 1]) / segmentLength : 1
    const from = shiftedAll[index - 1]
    const to = shiftedAll[index]
    const tip = {
      latitude: from.latitude + (to.latitude - from.latitude) * ratio,
      longitude: from.longitude + (to.longitude - from.longitude) * ratio,
    }
    return [...shiftedAll.slice(0, index), tip]
  }, [progress, shiftedAll, cumulative, totalLength])

  // Finché non è il suo turno il percorso non si vede
  if (!started || visible.length < 2) return null

  return (
    <>
      {/* Contorno bianco per il contrasto */}
      <Polyline
        coordinates={visible}
        strokeColor="#FFFFFF"
        strokeWidth={5.5}
        lineCap="round"
        lineJoin="round"
        geodesic={true}
        zIndex={5}
      />
      {/* Linea colorata della rotta */}
      <Polyline
        coordinates={visible}
        strokeColor={color}
        strokeWidth={3.8}
        lineCap="round"
        lineJoin="round"
        geodesic={true}
        zIndex={6}
      />
    </>
  )
}

export default AnimatedRoute
