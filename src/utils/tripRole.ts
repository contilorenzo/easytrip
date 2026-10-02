import { Trip } from '../components/TripsList/types'

// Permessi sul viaggio in base al ruolo: chi non ha un ruolo (viaggio creato sul telefono) è il proprietario
export const isOwner = (trip?: Trip | null) => !trip?.role || trip.role === 'owner'
export const canEdit = (trip?: Trip | null) => !trip?.role || trip.role === 'owner' || trip.role === 'editor'
export const isShared = (trip?: Trip | null) => !!trip?.role && trip.role !== 'owner'

export const roleLabel = (role?: string | null) =>
  role === 'editor' ? 'Può modificare' : role === 'viewer' ? 'Solo lettura' : 'Organizzatore'
