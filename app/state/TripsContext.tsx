import { createContext, useContext, useState } from 'react'
import { TripsContextState } from '.'
import { Trip } from '../components/TripsList/types'
import { AutocompleteDropdownItem } from 'react-native-autocomplete-dropdown'

const initialState: TripsContextState = {
  trips: [],
  setTrips: null,
  currentTrip: null,
  setCurrentTrip: null,
  countries: null,
  setCountries: null,
}

const TripsContext = createContext<TripsContextState>(initialState)

export const TripsContextProvider = ({ children }) => {
  const [trips, setTripsState] = useState([])
  const [currentTrip, setCurrentTrip] = useState<Trip>()
  const [countries, setCountries] = useState<AutocompleteDropdownItem[]>()

  const setTrips = (trips: Trip[]) => {
    setTripsState(trips)

    if (currentTrip) setCurrentTrip(trips.find((t) => t.id === currentTrip.id))
  }

  return (
    <TripsContext.Provider
      value={{
        trips,
        setTrips,
        currentTrip,
        setCurrentTrip,
        countries,
        setCountries,
      }}
    >
      {children}
    </TripsContext.Provider>
  )
}

export const useTripsContext = () => useContext(TripsContext)
