import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  FlightResult,
  Place,
  cheapestFlights,
  getFlightSettings,
  loadFlightSettings,
  resolveDestination,
  subscribeFlightSettings,
} from '../../services/flightSuggestions'
import { FlightError } from '../../services/flightLogic'

export type FlightState =
  | { kind: 'hidden' }
  | { kind: 'needs-origin' }
  | { kind: 'loading' }
  | { kind: 'result'; result: FlightResult }

interface Params {
  city: string
  countryId?: string | null
  startDate: Date
  endDate: Date
}

// Impostazioni dei voli sempre aggiornate (attivazione e origine)
export const useFlightSettings = () => {
  const [settings, setSettings] = useState(getFlightSettings())
  useEffect(() => {
    loadFlightSettings()
    setSettings(getFlightSettings())
    return subscribeFlightSettings(() => setSettings({ ...getFlightSettings() }))
  }, [])
  return settings
}

// Stato del suggerimento volo per una destinazione e un periodo; ricalcolato quando cambiano (con una breve attesa)
export const useFlightSuggestion = ({ city, countryId, startDate, endDate }: Params): FlightState => {
  const settings = useFlightSettings()
  const [state, setState] = useState<FlightState>({ kind: 'hidden' })

  const from = format(startDate, 'yyyy-MM-dd')
  const to = format(endDate, 'yyyy-MM-dd')
  const originCode = settings.origin?.code
  const trimmedCity = city.trim()

  useEffect(() => {
    // Niente suggerimenti per viaggi già iniziati, senza destinazione o se disattivati
    const upcoming = startDate.getTime() > Date.now()
    if (!settings.enabled || !upcoming || trimmedCity.length < 2 || !countryId) {
      setState({ kind: 'hidden' })
      return
    }
    if (!originCode) {
      setState({ kind: 'needs-origin' })
      return
    }

    let active = true
    setState({ kind: 'loading' })
    const timer = setTimeout(async () => {
      try {
        const destination = await resolveDestination(trimmedCity, String(countryId))
        if (!active) return
        if (!destination) {
          setState({ kind: 'result', result: { status: 'empty' } })
          return
        }
        const result = await cheapestFlights({ origin: originCode, destination, dateFrom: from, dateTo: to }, trimmedCity)
        if (active) setState({ kind: 'result', result })
      } catch (error) {
        const reason = error instanceof FlightError ? error.reason : 'unavailable'
        if (active) setState({ kind: 'result', result: { status: 'error', reason } })
      }
    }, 600)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [settings.enabled, originCode, trimmedCity, countryId, from, to])

  return state
}

export type { Place }
