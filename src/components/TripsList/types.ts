import { AutocompleteDropdownItem } from 'react-native-autocomplete-dropdown'
import { TripStep } from '../TripDetails/TripSteps/types'

export type TripRole = 'owner' | 'editor' | 'viewer'

export interface Trip {
  id: number
  city: string
  country: AutocompleteDropdownItem
  startDate: Date
  endDate: Date
  steps?: TripStep<any>[]
  // Id del viaggio sul server (presente dopo la prima sincronizzazione)
  remoteId?: string | null
  // Ruolo dell'utente: manca o 'owner' per i propri viaggi, 'editor' / 'viewer' per quelli condivisi da altri
  role?: TripRole | null
}

export interface NewTrip {
  city: string
  country: string
  startDate: string
  endDate: string
}

export interface TripDTO {
  id: number
  city: string
  country: string
  startDate: string
  endDate: string
  steps: string
  remoteId?: string | null
  role?: TripRole | null
}
