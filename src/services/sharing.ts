import * as Linking from 'expo-linking'
import { supabase } from './supabase'

export interface TripMember {
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  name: string
  // Visibile solo al proprietario del viaggio
  email: string | null
  photo_url: string | null
  is_owner: boolean
}

export type InviteRole = 'editor' | 'viewer'

// Link d'invito: apre l'app sulla schermata che accetta l'invito (nelle build vere usa lo schema dell'app)
export const inviteLink = (code: string) => Linking.createURL(`join/${code}`)

export const createInvite = async (remoteTripId: string, role: InviteRole): Promise<string> => {
  const { data, error } = await supabase.rpc('create_trip_invite', { p_trip_id: remoteTripId, p_role: role })
  if (error) throw error
  return data as string
}

// Accetta un invito e restituisce l'id (sul server) del viaggio a cui si ha ora accesso
export const acceptInvite = async (code: string): Promise<string> => {
  const { data, error } = await supabase.rpc('accept_trip_invite', { p_code: code })
  if (error) throw error
  return data as string
}

export const listMembers = async (remoteTripId: string): Promise<TripMember[]> => {
  const { data, error } = await supabase.rpc('list_trip_members', { p_trip_id: remoteTripId })
  if (error) throw error
  return (data ?? []) as TripMember[]
}

export const setMemberRole = async (remoteTripId: string, userId: string, role: InviteRole) => {
  const { error } = await supabase.from('trip_members').update({ role }).eq('trip_id', remoteTripId).eq('user_id', userId)
  if (error) throw error
}

export const removeMember = async (remoteTripId: string, userId: string) => {
  const { error } = await supabase.from('trip_members').delete().eq('trip_id', remoteTripId).eq('user_id', userId)
  if (error) throw error
}

// Estrae il codice da un link d'invito o da un codice scritto a mano
export const parseInviteCode = (input: string): string => {
  const trimmed = input.trim()
  const match = trimmed.match(/join\/([A-Za-z0-9]+)/)
  return (match ? match[1] : trimmed).toUpperCase()
}
