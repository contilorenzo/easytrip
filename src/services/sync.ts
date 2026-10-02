import { getDatabase } from '../components/common/db/utils'
import { supabase } from './supabase'

// Regola unica: vince la modifica più recente (confronto tra `updatedAt` locale e `client_updated_at` sul server).
// I viaggi eliminati sul server restano come righe con `deleted_at` e seguono la stessa regola.

interface LocalTrip {
  id: number
  city: string
  country: string
  startDate: string
  endDate: string
  steps: string
  updatedAt: string
  remoteId: string | null
  role: string | null
}

interface RemoteTrip {
  id: string
  city: string | null
  country: any
  start_date: string
  end_date: string
  steps: any
  client_updated_at: string
  deleted_at: string | null
  user_id: string
}

const time = (value: string | null | undefined) => (value ? new Date(value).getTime() : 0)

const parseJson = (value: string, fallback: any) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const toRemotePayload = (trip: LocalTrip) => ({
  city: trip.city,
  country: parseJson(trip.country, null),
  start_date: trip.startDate,
  end_date: trip.endDate,
  steps: parseJson(trip.steps || '[]', []),
  client_updated_at: trip.updatedAt,
  deleted_at: null,
})

const throwIfError = <T>(result: { data: T; error: any }): T => {
  if (result.error) throw result.error
  return result.data
}

export const syncTrips = async (): Promise<void> => {
  const db = await getDatabase()

  const remoteTrips = throwIfError<RemoteTrip[]>(
    (await supabase.from('trips').select('*')) as any
  )
  const remoteById = new Map(remoteTrips.map((trip) => [trip.id, trip]))

  // Viaggi condivisi: il server restituisce anche quelli di altri utenti a cui ho accesso. Il mio ruolo su ognuno è
  // 'owner' se è mio, altrimenti quello della tabella dei membri ('editor' può modificare, 'viewer' solo leggere).
  const { data: sessionData } = await supabase.auth.getSession()
  const myId = sessionData.session?.user.id
  const memberships = throwIfError<{ trip_id: string; role: string }[]>(
    (await supabase.from('trip_members').select('trip_id, role')) as any
  )
  const memberRole = new Map(memberships.map((m) => [m.trip_id, m.role]))
  const roleFor = (remote: RemoteTrip): string =>
    remote.user_id === myId ? 'owner' : memberRole.get(remote.id) ?? 'viewer'

  // 1. Eliminazioni fatte su questo dispositivo: le comunico al server se non c'è una modifica più recente
  const tombstones: { remoteId: string; deletedAt: string }[] = await db.getAllAsync(
    'SELECT * FROM trip_tombstones'
  )
  for (const tombstone of tombstones) {
    const remote = remoteById.get(tombstone.remoteId)
    // Solo il proprietario può eliminare un viaggio sul server
    if (remote && roleFor(remote) === 'owner' && !remote.deleted_at && time(tombstone.deletedAt) >= time(remote.client_updated_at)) {
      throwIfError(
        (await supabase
          .from('trips')
          .update({ deleted_at: tombstone.deletedAt, client_updated_at: tombstone.deletedAt })
          .eq('id', remote.id)) as any
      )
      remote.deleted_at = tombstone.deletedAt
    }
    await db.runAsync('DELETE FROM trip_tombstones WHERE remoteId = ?', [tombstone.remoteId])
  }

  const localTrips: LocalTrip[] = await db.getAllAsync('SELECT * FROM trips')
  const localByRemoteId = new Map(localTrips.filter((t) => t.remoteId).map((t) => [t.remoteId as string, t]))

  // 2. Dal server verso il telefono (e viceversa, riga per riga)
  for (const remote of remoteTrips) {
    const local = localByRemoteId.get(remote.id)

    const role = roleFor(remote)

    if (remote.deleted_at) {
      if (!local) continue
      // Se il proprietario ha eliminato il viaggio sparisce anche dagli altri; il proprietario stesso può "ripristinarlo"
      // modificandolo dopo l'eliminazione
      if (role === 'owner' && time(local.updatedAt) > time(remote.deleted_at)) {
        // Modificato qui dopo l'eliminazione: vince la modifica, il viaggio torna sul server
        throwIfError(
          (await supabase.from('trips').update(toRemotePayload(local)).eq('id', remote.id)) as any
        )
      } else {
        await db.runAsync('DELETE FROM trips WHERE id = ?', [local.id])
      }
      continue
    }

    if (!local) {
      await db.runAsync(
        'INSERT INTO trips (city, country, startDate, endDate, steps, updatedAt, remoteId, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          remote.city ?? '',
          JSON.stringify(remote.country),
          new Date(remote.start_date).toISOString(),
          new Date(remote.end_date).toISOString(),
          JSON.stringify(remote.steps ?? []),
          new Date(remote.client_updated_at).toISOString(),
          remote.id,
          role,
        ]
      )
      continue
    }

    // Il ruolo può cambiare (es. da lettura a modifica) senza che il viaggio sia stato modificato
    if (local.role !== role) await db.runAsync('UPDATE trips SET role = ? WHERE id = ?', [role, local.id])

    const remoteTime = time(remote.client_updated_at)
    const localTime = time(local.updatedAt)

    if (remoteTime > localTime) {
      await db.runAsync(
        'UPDATE trips SET city = ?, country = ?, startDate = ?, endDate = ?, steps = ?, updatedAt = ? WHERE id = ?',
        [
          remote.city ?? '',
          JSON.stringify(remote.country),
          new Date(remote.start_date).toISOString(),
          new Date(remote.end_date).toISOString(),
          JSON.stringify(remote.steps ?? []),
          new Date(remote.client_updated_at).toISOString(),
          local.id,
        ]
      )
    } else if (localTime > remoteTime && role !== 'viewer') {
      // Il filtro evita di sovrascrivere una modifica arrivata nel frattempo da un altro dispositivo
      throwIfError(
        (await supabase
          .from('trips')
          .update(toRemotePayload(local))
          .eq('id', remote.id)
          .lt('client_updated_at', local.updatedAt)) as any
      )
    }
  }

  // Viaggi condivisi a cui non ho più accesso (rimosso dal proprietario o viaggio eliminato): li tolgo dal telefono
  for (const local of localTrips) {
    if (local.remoteId && local.role && local.role !== 'owner' && !remoteById.has(local.remoteId)) {
      await db.runAsync('DELETE FROM trips WHERE id = ?', [local.id])
    }
  }

  // 3. Viaggi nuovi creati su questo dispositivo
  const newTrips: LocalTrip[] = await db.getAllAsync('SELECT * FROM trips WHERE remoteId IS NULL')
  for (const trip of newTrips) {
    const inserted = throwIfError<{ id: string }[]>(
      (await supabase.from('trips').insert(toRemotePayload(trip)).select('id')) as any
    )
    await db.runAsync('UPDATE trips SET remoteId = ? WHERE id = ?', [inserted[0].id, trip.id])
  }
}
