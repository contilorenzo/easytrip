import { AutocompleteDropdownItem } from 'react-native-autocomplete-dropdown'
import { Trip } from '../components/TripsList/types'

export type TripsContextState = {
  trips: Trip[]
  setTrips: (trips: Trip[]) => void
  currentTrip: Trip
  setCurrentTrip: (trip: Trip) => void
  countries: AutocompleteDropdownItem[]
  setCountries: (countries: AutocompleteDropdownItem[]) => void
}
