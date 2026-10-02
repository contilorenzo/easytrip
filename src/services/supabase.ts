import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// L'URL del progetto è solo `https://<ref>.supabase.co`: se è stato incollato un indirizzo più lungo
// (es. quello dell'API REST, con /rest/v1/) tengo soltanto l'origine
const normalizeUrl = (url?: string) => {
  if (!url) return url
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

const supabaseUrl = normalizeUrl(process.env.EXPO_PUBLIC_SUPABASE_URL)
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase non configurato: mancano EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl ?? 'http://localhost', supabaseAnonKey ?? 'missing', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
