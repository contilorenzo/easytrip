import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'
import { NewTrip, Trip, TripDTO } from '../../TripsList/types'
import { TripStep } from '../../TripDetails/TripSteps/types'
import { isAfter } from 'date-fns'
import { TripsContextState } from '../../../state'
import { TranslationsKeys } from '../../../translations/types'
import { t } from '../../../translations'
import { AutocompleteDropdownItem } from 'react-native-autocomplete-dropdown'
import { previewTripDatesChange } from '../../../utils/tripDates'
import { supabase } from '../../../services/supabase'

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

export const nowISO = () => new Date().toISOString()

// Colonne e tabella usate dalla sincronizzazione col server:
// - updatedAt: quando il viaggio è stato modificato l'ultima volta su questo dispositivo (decide chi vince)
// - remoteId: id del viaggio sul server
// - trip_tombstones: viaggi eliminati qui che il server deve ancora sapere
const migrateSyncColumns = async (db: SQLite.SQLiteDatabase) => {
  const columns: { name: string }[] = await db.getAllAsync('PRAGMA table_info(trips)')
  const names = columns.map((c) => c.name)
  if (!names.includes('updatedAt')) await db.execAsync('ALTER TABLE trips ADD COLUMN updatedAt text')
  if (!names.includes('remoteId')) await db.execAsync('ALTER TABLE trips ADD COLUMN remoteId text')
  // Condivisione: ruolo dell'utente su questo viaggio ('owner' se è suo, altrimenti 'editor' o 'viewer')
  if (!names.includes('role')) await db.execAsync("ALTER TABLE trips ADD COLUMN role text DEFAULT 'owner'")
  await db.execAsync(
    'create table if not exists trip_tombstones (remoteId text primary key not null, deletedAt text not null);'
  )
  // I viaggi già presenti prima della sincronizzazione contano come modificati ora
  await db.runAsync('UPDATE trips SET updatedAt = ? WHERE updatedAt IS NULL', [nowISO()])
}

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (Platform.OS === 'web') {
    return {
      transaction: () => {
        return {
          executeSql: () => {},
        }
      },
    } as unknown as SQLite.SQLiteDatabase
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('db.db')
      await db.execAsync(
        'create table if not exists trips (id integer primary key not null, city text, country text, startDate text, endDate text, steps text);'
      )
      await migrateSyncColumns(db)
      await db.execAsync(
        'create table if not exists trip_tickets (id integer primary key autoincrement not null, tripId integer not null, name text not null, uri text not null, type text not null, uploadedAt text not null);'
      )
      return db
    })().catch((error) => {
      dbPromise = null
      console.error('Failed to open database:', error)
      throw error
    })
  }

  return dbPromise
}

// Dopo l'eliminazione dell'account i viaggi restano sul telefono ma non sono più collegati al server:
// se ci si riconnette verranno caricati come viaggi nuovi
export const unlinkTripsFromAccount = async () => {
  const db = await getDatabase()
  await db.runAsync('UPDATE trips SET remoteId = NULL')
  await db.runAsync('DELETE FROM trip_tombstones')
}

// Toglie dal telefono tutti i viaggi (e le note di eliminazione): serve quando si esce o si cambia account,
// così un altro utente non vede né carica i viaggi del precedente
export const clearAllLocalTrips = async () => {
  const db = await getDatabase()
  await db.runAsync('DELETE FROM trips')
  await db.runAsync('DELETE FROM trip_tombstones')
}

export const createTripsTable = async () => {
  try {
    await getDatabase()
  } catch (error) {
    console.error(error)
  }
}

export const loadTrips = async (context: TripsContextState) => {
  try {
    const db = await getDatabase()
    const rows: TripDTO[] = await db.getAllAsync('select * from trips')
    context.setTrips(formatTrips(rows))
  } catch (error: any) {
    console.error('Errore nel caricamento dei viaggi:', error, error?.stack)
  }
}

// Trova nel database del telefono il viaggio con un certo id sul server (per esempio dopo aver accettato un invito)
export const getTripByRemoteId = async (remoteId: string): Promise<Trip | null> => {
  const db = await getDatabase()
  const rows: TripDTO[] = await db.getAllAsync('SELECT * FROM trips WHERE remoteId = ?', [remoteId])
  return rows.length > 0 ? formatTrips(rows)[0] : null
}

export const formatTrips = (trips: TripDTO[]): Trip[] => {
  const formattedTrips = trips.map((trip) => {
    let parsedSteps: TripStep<any>[] = []
    try {
      parsedSteps =
        typeof trip.steps === 'string'
          ? JSON.parse(trip.steps || '[]')
          : trip.steps || []
    } catch (e) {
      console.error('Error parsing steps for trip', trip.id, e)
    }

    let parsedCountry: AutocompleteDropdownItem = { id: '', title: '' }
    try {
      parsedCountry =
        typeof trip.country === 'string'
          ? JSON.parse(trip.country)
          : trip.country
    } catch (e) {
      console.error('Error parsing country for trip', trip.id, e)
    }

    return {
      ...trip,
      startDate: new Date(trip.startDate),
      endDate: new Date(trip.endDate),
      steps: sortStepsByStartTime(parsedSteps),
      country: parsedCountry,
    }
  })

  return sortTripsByDate(formattedTrips)
}

const sortStepsByStartTime = (steps: TripStep<any>[]) => {
  const detachedSteps = [...steps]

  detachedSteps.sort((a, b) => {
    var dateA = new Date(a.startDateTime)
    var dateB = new Date(b.startDateTime)
    return isAfter(dateA, dateB) ? 1 : -1
  })

  return detachedSteps
}

const sortTripsByDate = (trips: Trip[]) => {
  const detachedTrips = [...trips]

  detachedTrips.sort((a, b) => {
    var dateA = new Date(a.startDate)
    var dateB = new Date(b.startDate)
    return isAfter(dateA, dateB) ? 1 : -1
  })

  return detachedTrips
}

export const addTrip = async (trip: NewTrip, context: TripsContextState) => {
  try {
    const db = await getDatabase()
    const JSONCountry = JSON.stringify(trip.country)

    await db.runAsync(
      'insert into trips (city, country, startDate, endDate, steps, updatedAt) values (?, ?, ?, ?, ?, ?)',
      [trip.city, JSONCountry, trip.startDate, trip.endDate, '[]', nowISO()]
    )
    await loadTrips(context)
  } catch (error) {
    console.error('Error adding trip:', error)
    throw error
  }
}

// Elimina un viaggio. La conferma all'utente va chiesta prima, da chi chiama (vedi confirmAction)
export const removeTrip = async (
  tripId: number,
  context: TripsContextState
) => {
  try {
    const db = await getDatabase()
    await db.runAsync(
      'INSERT OR REPLACE INTO trip_tombstones (remoteId, deletedAt) SELECT remoteId, ? FROM trips WHERE id = ? AND remoteId IS NOT NULL',
      [nowISO(), tripId]
    )
    await db.runAsync('DELETE FROM trips WHERE id = ?', [tripId])
    await loadTrips(context)
  } catch (error) {
    console.error(error)
  }
}

// Un viaggio condiviso da altri non si "elimina": si lascia. Si toglie la propria partecipazione sul server e il viaggio
// dal telefono (senza lasciare nessuna nota di eliminazione, che altrimenti cancellerebbe il viaggio anche per gli altri).
export const leaveTrip = async (trip: Trip, userId: string, context: TripsContextState) => {
  const db = await getDatabase()
  if (trip.remoteId) {
    const { error } = await supabase.from('trip_members').delete().eq('trip_id', trip.remoteId).eq('user_id', userId)
    if (error) throw error
  }
  await db.runAsync('DELETE FROM trips WHERE id = ?', [trip.id])
  await loadTrips(context)
}

export const addStep = async (
  newStep: TripStep<any>,
  context: TripsContextState
) => {
  try {
    const db = await getDatabase()
    const trip = context.currentTrip

    let steps = trip.steps ?? []
    steps.push(newStep)

    await db.runAsync('UPDATE trips SET steps = ?, updatedAt = ? WHERE id = ?', [
      JSON.stringify(steps),
      nowISO(),
      trip.id,
    ])
    await loadTrips(context)
  } catch (error) {
    console.error(error)
  }
}

export const updateStep = async (
  originalStep: TripStep<any>,
  newStep: TripStep<any>,
  context: TripsContextState
) => {
  try {
    const db = await getDatabase()
    const trip = context.currentTrip

    let steps = trip.steps ?? []
    const filteredSteps = steps.filter(
      (step) =>
        step.title !== originalStep.title ||
        step.startDateTime !== originalStep.startDateTime ||
        step.endDateTime !== originalStep.endDateTime
    )
    filteredSteps.push(newStep)

    await db.runAsync('UPDATE trips SET steps = ?, updatedAt = ? WHERE id = ?', [
      JSON.stringify(filteredSteps),
      nowISO(),
      trip.id,
    ])
    await loadTrips(context)
  } catch (error) {
    console.error(error)
  }
}

export const removeStep = async (
  stepToRemove: TripStep<any>,
  context: TripsContextState
) => {
  try {
    const db = await getDatabase()
    const trip = context.currentTrip

    let steps = trip.steps ?? []
    const filteredSteps = steps.filter(
      (step) =>
        step.title !== stepToRemove.title ||
        step.startDateTime !== stepToRemove.startDateTime ||
        step.endDateTime !== stepToRemove.endDateTime
    )

    await db.runAsync('UPDATE trips SET steps = ?, updatedAt = ? WHERE id = ?', [
      JSON.stringify(filteredSteps),
      nowISO(),
      trip.id,
    ])
    await loadTrips(context)
  } catch (error) {
    console.error(error)
  }
}

// Cambia le date di un viaggio: sposta le tappe di conseguenza ed elimina quelle che non ci stanno più
export const updateTripDates = async (
  trip: Trip,
  newStart: Date,
  newEnd: Date,
  context: TripsContextState
) => {
  const db = await getDatabase()
  const { keptSteps } = previewTripDatesChange(trip.steps, new Date(trip.startDate), newStart, newEnd)

  await db.runAsync('UPDATE trips SET startDate = ?, endDate = ?, steps = ?, updatedAt = ? WHERE id = ?', [
    newStart.toISOString(),
    newEnd.toISOString(),
    JSON.stringify(keptSteps),
    nowISO(),
    trip.id,
  ])
  await loadTrips(context)
}

export const addFullTrip = async (
  trip: {
    city: string
    country: any
    startDate: string
    endDate: string
    steps: TripStep<any>[]
  },
  context: TripsContextState
) => {
  try {
    const db = await getDatabase()
    const JSONCountry = JSON.stringify(trip.country)
    const JSONSteps = JSON.stringify(trip.steps)

    await db.runAsync(
      'insert into trips (city, country, startDate, endDate, steps, updatedAt) values (?, ?, ?, ?, ?, ?)',
      [trip.city, JSONCountry, trip.startDate, trip.endDate, JSONSteps, nowISO()]
    )
    await loadTrips(context)
  } catch (error) {
    console.error('Error adding full trip:', error)
    throw error
  }
}

export const clearAllTrips = async (context: TripsContextState) => {
  try {
    const db = await getDatabase()
    await db.runAsync(
      'INSERT OR REPLACE INTO trip_tombstones (remoteId, deletedAt) SELECT remoteId, ? FROM trips WHERE remoteId IS NOT NULL',
      [nowISO()]
    )
    await db.runAsync('delete from trips')
    await loadTrips(context)
  } catch (error) {
    console.error('Error clearing trips:', error)
    throw error
  }
}

const deleteDB = async () => {
  const db = await getDatabase()
  await db.execAsync(`DROP TABLE IF EXISTS trips`)
}
