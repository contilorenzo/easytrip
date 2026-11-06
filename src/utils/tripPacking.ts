import { Platform } from 'react-native'
import { getDatabase } from '../components/common/db/utils'

export interface PackingItem {
  id: number
  tripId: number
  // Voce del catalogo (null se creata dall'utente)
  catalogId: string | null
  name: string
  categoryId: string
  packed: boolean
  createdAt: string
}

interface Row extends Omit<PackingItem, 'packed'> {
  packed: number
}

const toItem = (row: Row): PackingItem => ({ ...row, packed: row.packed === 1 })

// Le scritture vanno una alla volta: due transazioni SQLite sovrapposte (tocchi ravvicinati) fallirebbero
let writeQueue: Promise<unknown> = Promise.resolve()
const enqueue = <T,>(task: () => Promise<T>): Promise<T> => {
  const run = writeQueue.then(task, task)
  writeQueue = run.catch(() => undefined)
  return run
}

// Sul web non c'è il database: la lista vive solo in memoria
const webStore = new Map<number, PackingItem[]>()
let webCounter = 1

export const getPackingItems = async (tripId: number): Promise<PackingItem[]> => {
  if (Platform.OS === 'web') return webStore.get(tripId) || []
  try {
    const db = await getDatabase()
    const rows = await db.getAllAsync<Row>('SELECT * FROM trip_packing WHERE tripId = ? ORDER BY id ASC', [tripId])
    return (rows || []).map(toItem)
  } catch (error) {
    console.error('Error loading packing list for trip', tripId, error)
    return []
  }
}

export interface NewPackingItem {
  catalogId: string | null
  name: string
  categoryId: string
}

const addPackingItemsNow = async (tripId: number, items: NewPackingItem[]): Promise<void> => {
  if (items.length === 0) return
  const createdAt = new Date().toISOString()
  if (Platform.OS === 'web') {
    const list = webStore.get(tripId) || []
    items.forEach((it) => list.push({ id: webCounter++, tripId, packed: false, createdAt, ...it }))
    webStore.set(tripId, list)
    return
  }
  const db = await getDatabase()
  await db.withTransactionAsync(async () => {
    for (const it of items) {
      await db.runAsync(
        'INSERT INTO trip_packing (tripId, catalogId, name, categoryId, packed, createdAt) VALUES (?, ?, ?, ?, 0, ?)',
        [tripId, it.catalogId, it.name, it.categoryId, createdAt]
      )
    }
  })
}

const setPackingItemPackedNow = async (item: PackingItem, packed: boolean): Promise<void> => {
  if (Platform.OS === 'web') {
    const list = webStore.get(item.tripId) || []
    webStore.set(item.tripId, list.map((i) => (i.id === item.id ? { ...i, packed } : i)))
    return
  }
  const db = await getDatabase()
  await db.runAsync('UPDATE trip_packing SET packed = ? WHERE id = ?', [packed ? 1 : 0, item.id])
}

const removePackingItemsNow = async (tripId: number, ids: number[]): Promise<void> => {
  if (ids.length === 0) return
  if (Platform.OS === 'web') {
    webStore.set(tripId, (webStore.get(tripId) || []).filter((i) => !ids.includes(i.id)))
    return
  }
  const db = await getDatabase()
  await db.withTransactionAsync(async () => {
    for (const id of ids) await db.runAsync('DELETE FROM trip_packing WHERE id = ?', [id])
  })
}

// Toglie la spunta a tutto (utile per riusare la lista al ritorno)
const resetPackedItemsNow = async (tripId: number): Promise<void> => {
  if (Platform.OS === 'web') {
    webStore.set(tripId, (webStore.get(tripId) || []).map((i) => ({ ...i, packed: false })))
    return
  }
  const db = await getDatabase()
  await db.runAsync('UPDATE trip_packing SET packed = 0 WHERE tripId = ?', [tripId])
}

export const summarizePacking = (items: PackingItem[]) => ({
  total: items.length,
  packed: items.filter((i) => i.packed).length,
})

export const addPackingItems = (tripId: number, items: NewPackingItem[]) => enqueue(() => addPackingItemsNow(tripId, items))
export const setPackingItemPacked = (item: PackingItem, packed: boolean) => enqueue(() => setPackingItemPackedNow(item, packed))
export const removePackingItems = (tripId: number, ids: number[]) => enqueue(() => removePackingItemsNow(tripId, ids))
export const resetPackedItems = (tripId: number) => enqueue(() => resetPackedItemsNow(tripId))
