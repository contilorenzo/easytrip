import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'

WebBrowser.maybeCompleteAuthSession()

export interface AccountUser {
  id: string
  name: string
  email: string
  photoUrl?: string
}

export const toAccountUser = (user: {
  id: string
  email?: string
  user_metadata?: Record<string, any>
}): AccountUser => ({
  id: user.id,
  // Il nome scelto dall'utente ha la precedenza su quello di Google
  name: user.user_metadata?.custom_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Utente',
  email: user.email ?? '',
  // La foto scelta dall'utente ha la precedenza su quella di Google
  photoUrl: user.user_metadata?.custom_avatar_url ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture,
})

// Accesso con Google tramite browser (OAuth di Supabase): funziona su iOS, Android e in Expo Go senza moduli nativi.
// Serve che l'URL di ritorno sia tra i "Redirect URLs" consentiti in Supabase (Authentication → URL Configuration).
export class SignInCancelledError extends Error {}

const signInWithGoogleInBrowser = async (): Promise<void> => {
  const redirectTo = Linking.createURL('auth-callback')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (!data?.url) throw new Error('Supabase non ha restituito l’indirizzo di accesso')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type !== 'success') throw new SignInCancelledError('Accesso annullato')

  // I token tornano nel frammento dell'URL (#access_token=...), oppure un `code` da scambiare (flusso PKCE)
  const url = result.url
  const fragment = url.includes('#') ? url.split('#')[1] : ''
  const params = new URLSearchParams(fragment || (url.split('?')[1] ?? ''))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const code = params.get('code')

  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (sessionError) throw sessionError
  } else if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) throw exchangeError
  } else {
    throw new Error(params.get('error_description') ?? 'Accesso non riuscito')
  }
}

export const signInWithGoogle = signInWithGoogleInBrowser

export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut()
}

// Elimina l'account e i viaggi salvati nel cloud. Usa la funzione SQL `delete_my_account` (vedi supabase/schema.sql),
// perché con la chiave pubblica l'app non può cancellare un utente da sola.
export const deleteAccount = async (): Promise<void> => {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
  // L'utente non esiste più sul server: chiudo solo la sessione locale
  await supabase.auth.signOut({ scope: 'local' })
}

// Messaggi di Supabase in italiano per gli errori più comuni
const translateAuthError = (message: string) => {
  if (/invalid login credentials/i.test(message)) return 'Email o password non corrette.'
  if (/already registered|already been registered/i.test(message)) return 'Questa email è già registrata: accedi.'
  if (/password should be at least/i.test(message)) return 'La password deve avere almeno 6 caratteri.'
  if (/email not confirmed/i.test(message)) return 'Devi prima confermare l’indirizzo email: controlla la posta.'
  if (/rate limit/i.test(message)) return 'Troppi tentativi, riprova tra qualche minuto.'
  return message
}

export const signInWithEmail = async (email: string, password: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(translateAuthError(error.message))
}

// Se in Supabase è attiva la conferma dell'email, dopo la registrazione non c'è ancora una sessione:
// in quel caso restituisce true e l'utente deve confermare dalla posta prima di accedere
export const signUpWithEmail = async (email: string, password: string, name: string): Promise<boolean> => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim() || email.trim().split('@')[0] } },
  })
  if (error) throw new Error(translateAuthError(error.message))
  return !data.session
}

// Foto profilo personalizzata: caricata nello storage (cartella = id utente) e salvata nei metadati.
// Sta in un campo a parte perché al login Google Supabase riscrive avatar_url.
export const setCustomPhoto = async (userId: string, uri: string): Promise<void> => {
  const response = await fetch(uri)
  const body = await response.arrayBuffer()
  // Nome nuovo a ogni cambio, così gli altri non restano con l'immagine in cache
  const path = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: 'image/jpeg' })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const { error: updateError } = await supabase.auth.updateUser({ data: { custom_avatar_url: data.publicUrl } })
  if (updateError) throw updateError
}

// Torna alla foto predefinita (quella di Google, se c'è)
export const removeCustomPhoto = async (): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ data: { custom_avatar_url: null } })
  if (error) throw error
}

// Nome personalizzato (campo a parte: al login Google Supabase riscrive full_name)
export const setCustomName = async (name: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ data: { custom_name: name.trim() } })
  if (error) throw error
}
