import { Trip } from '../components/TripsList/types'

export type TripsContextState = {
  trips: Trip[]
  setTrips: (trips: Trip[]) => void
  currentTrip: Trip
  setCurrentTrip: (trip: Trip) => void
}
