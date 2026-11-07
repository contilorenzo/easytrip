import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { Trip } from '../TripsList/types'
import { getTripTickets } from '../../utils/tripTickets'

// Un viaggio "ha già i voli" se ha biglietti caricati o una tappa raggiunta in aereo
export const useTripHasFlights = (trip: Trip | null | undefined) => {
  const [hasTickets, setHasTickets] = useState<boolean | null>(null)
  const tripId = trip?.id

  useFocusEffect(
    useCallback(() => {
      if (tripId === undefined) return
      let active = true
      getTripTickets(tripId)
        .then((tickets) => active && setHasTickets(tickets.length > 0))
        .catch(() => active && setHasTickets(false))
      return () => {
        active = false
      }
    }, [tripId])
  )

  const hasPlaneStep = !!trip?.steps?.some((s) => String((s.extraData as any)?.arrivedBy ?? '').toLowerCase() === 'plane')
  // Finché non sappiamo se ci sono biglietti non mostriamo nulla (evita un lampo della card)
  return { known: hasTickets !== null, hasFlights: !!hasTickets || hasPlaneStep }
}
