import * as FileSystem from 'expo-file-system/legacy'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { getDatabase } from '../components/common/db/utils'

export interface TripTicket {
  id: number
  tripId: number
  name: string
  uri: string
  type: 'image' | 'pdf'
  uploadedAt: string
}

// In-memory fallback for web
const webTicketsCache = new Map<number, TripTicket[]>()

/**
 * Fetch all tickets associated with a trip
 */
export const getTripTickets = async (tripId: number): Promise<TripTicket[]> => {
  if (Platform.OS === 'web') {
    return webTicketsCache.get(tripId) || []
  }

  try {
    const db = await getDatabase()
    const rows = await db.getAllAsync<TripTicket>(
      'SELECT * FROM trip_tickets WHERE tripId = ? ORDER BY id DESC',
      [tripId]
    )
    return rows || []
  } catch (error) {
    console.error('Error fetching tickets for trip', tripId, error)
    return []
  }
}

/**
 * Persist a file into the permanent document directory
 */
const persistFile = async (sourceUri: string, originalName: string): Promise<string> => {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return sourceUri
  }

  try {
    const ticketsDir = `${FileSystem.documentDirectory}tickets/`
    const dirInfo = await FileSystem.getInfoAsync(ticketsDir)
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(ticketsDir, { intermediates: true })
    }

    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const destUri = `${ticketsDir}${Date.now()}_${safeName}`
    await FileSystem.copyAsync({ from: sourceUri, to: destUri })
    return destUri
  } catch (err) {
    console.warn('Could not copy file to permanent directory, using source URI:', err)
    return sourceUri
  }
}

/**
 * Add a new ticket to a trip
 */
export const addTripTicket = async (
  tripId: number,
  name: string,
  sourceUri: string,
  type: 'image' | 'pdf'
): Promise<TripTicket> => {
  const finalUri = await persistFile(sourceUri, name)
  const uploadedAt = new Date().toISOString()

  if (Platform.OS === 'web') {
    const list = webTicketsCache.get(tripId) || []
    const newTicket: TripTicket = {
      id: Date.now(),
      tripId,
      name,
      uri: finalUri,
      type,
      uploadedAt,
    }
    webTicketsCache.set(tripId, [newTicket, ...list])
    return newTicket
  }

  const db = await getDatabase()
  const result = await db.runAsync(
    'INSERT INTO trip_tickets (tripId, name, uri, type, uploadedAt) VALUES (?, ?, ?, ?, ?)',
    [tripId, name, finalUri, type, uploadedAt]
  )

  return {
    id: result.lastInsertRowId,
    tripId,
    name,
    uri: finalUri,
    type,
    uploadedAt,
  }
}

/**
 * Delete a ticket from database and local storage
 */
export const deleteTripTicket = async (ticket: TripTicket): Promise<void> => {
  if (Platform.OS === 'web') {
    const list = webTicketsCache.get(ticket.tripId) || []
    webTicketsCache.set(
      ticket.tripId,
      list.filter((t) => t.id !== ticket.id)
    )
    return
  }

  try {
    const db = await getDatabase()
    await db.runAsync('DELETE FROM trip_tickets WHERE id = ?', [ticket.id])

    // Clean up file if stored locally using the new File API (avoids deprecation warning)
    if (FileSystem.documentDirectory && ticket.uri.startsWith(FileSystem.documentDirectory)) {
      try {
        const file = new File(ticket.uri)
        await file.delete()
      } catch {
        // File may already be gone — ignore silently
      }
    }
  } catch (error) {
    console.error('Error deleting ticket:', error)
    throw error
  }
}

/**
 * Pick an image from photo library
 */
export const pickTicketFromLibrary = async (): Promise<{
  uri: string
  name: string
  type: 'image'
} | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Permesso di accesso alla galleria foto negato.')
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    allowsEditing: false,
  })

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null
  }

  const asset = result.assets[0]
  const name = asset.fileName || `Biglietto_${Date.now()}.jpg`
  return {
    uri: asset.uri,
    name,
    type: 'image',
  }
}

/**
 * Take a photo with camera
 */
export const takeTicketPhoto = async (): Promise<{
  uri: string
  name: string
  type: 'image'
} | null> => {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Permesso di accesso alla fotocamera negato.')
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.9,
    allowsEditing: false,
  })

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null
  }

  const asset = result.assets[0]
  const name = asset.fileName || `Foto_Biglietto_${Date.now()}.jpg`
  return {
    uri: asset.uri,
    name,
    type: 'image',
  }
}

/**
 * Pick a PDF or image document
 */
export const pickTicketDocument = async (): Promise<{
  uri: string
  name: string
  type: 'pdf' | 'image'
} | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  })

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null
  }

  const asset = result.assets[0]
  const isPdf =
    (asset.mimeType && asset.mimeType.includes('pdf')) ||
    asset.name.toLowerCase().endsWith('.pdf')

  return {
    uri: asset.uri,
    name: asset.name,
    type: isPdf ? 'pdf' : 'image',
  }
}

/**
 * Open or share a ticket file with native viewer / system sheet
 */
export const openOrShareTicket = async (ticket: TripTicket): Promise<void> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync()
    if (isAvailable) {
      await Sharing.shareAsync(ticket.uri, {
        dialogTitle: ticket.name,
        UTI: ticket.type === 'pdf' ? 'com.adobe.pdf' : 'public.image',
      })
    }
  } catch (error) {
    console.error('Error opening or sharing ticket:', error)
  }
}

// Elimina tutti i biglietti salvati (file e righe): serve quando si cambia account e i viaggi vengono tolti dal telefono
export const clearAllTickets = async (): Promise<void> => {
  const db = await getDatabase()
  const rows: any[] = await db.getAllAsync('SELECT * FROM trip_tickets')
  for (const row of rows) {
    try {
      await deleteTripTicket(row as TripTicket)
    } catch {
      // un file già mancante non deve bloccare la pulizia
    }
  }
  await db.runAsync('DELETE FROM trip_tickets')
}
