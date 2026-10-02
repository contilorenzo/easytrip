import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useTripsContext } from './TripsContext'
import { AccountUser, SignInCancelledError, signInWithGoogle as googleSignIn, signInWithEmail as emailSignIn, signUpWithEmail as emailSignUp, signOut as authSignOut, deleteAccount as authDeleteAccount, toAccountUser } from '../services/auth'
import { supabase } from '../services/supabase'
import { syncTrips } from '../services/sync'
import { clearAllLocalTrips, loadTrips, unlinkTripsFromAccount } from '../components/common/db/utils'
import { clearAllTickets } from '../utils/tripTickets'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export interface AccountContextState {
  user: AccountUser | null
  isSigningIn: boolean
  signInError: string | null
  syncError: string | null
  signInWithGoogle: () => Promise<void>
  // Accesso e registrazione con email e password (utile anche per provare l'app con più utenti)
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>
  // Esce dall'account: prima invia le modifiche non sincronizzate (se non riesce lancia 'SYNC_FAILED', a meno che force sia true)
  // e poi toglie i viaggi dal telefono
  signOut: (force?: boolean) => Promise<void>
  // Elimina account e dati nel cloud; lancia un errore se non riesce
  deleteAccount: () => Promise<void>
  syncStatus: SyncStatus
  lastSyncAt: Date | null
  // true se ci sono modifiche locali non ancora inviate
  hasPendingChanges: boolean
  autoSync: boolean
  setAutoSync: (value: boolean) => void
  syncNow: () => Promise<void>
  // Solo per sviluppo: la prossima sincronizzazione fallisce, per vedere lo stato di errore
  simulateErrorOnNextSync: () => void
}

const noop = async () => {}

const AccountContext = createContext<AccountContextState>({
  user: null,
  isSigningIn: false,
  signInError: null,
  syncError: null,
  signInWithGoogle: noop,
  signInWithEmail: noop,
  signUpWithEmail: noop,
  signOut: noop,
  deleteAccount: noop,
  syncStatus: 'idle',
  lastSyncAt: null,
  hasPendingChanges: false,
  autoSync: true,
  setAutoSync: () => {},
  syncNow: noop,
  simulateErrorOnNextSync: () => {},
})

const AUTO_SYNC_DELAY_MS = 2000
// Ultimo utente i cui viaggi sono sul telefono: se accede un altro utente, quei viaggi vengono tolti
const LAST_USER_KEY = 'easytrip:lastUserId'

export const AccountContextProvider = ({ children }: { children: React.ReactNode }) => {
  const tripsContext = useTripsContext()
  const { trips } = tripsContext
  const tripsContextRef = useRef(tripsContext)
  tripsContextRef.current = tripsContext

  const [user, setUser] = useState<AccountUser | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [autoSync, setAutoSync] = useState(true)
  // false finché non ho controllato se i viaggi sul telefono sono di un altro utente: prima non si sincronizza
  const [accountReady, setAccountReady] = useState(false)

  const failNextRef = useRef(false)
  const tripsRef = useRef(trips)
  tripsRef.current = trips
  const isFirstTripsRef = useRef(true)
  // Il ricaricamento dei viaggi dopo una sincronizzazione non è una modifica dell'utente
  const skipNextTripsChangeRef = useRef(false)

  const runSync = useCallback(async (): Promise<boolean> => {
    setSyncStatus('syncing')
    setSyncError(null)
    try {
      if (failNextRef.current) {
        failNextRef.current = false
        throw new Error('Errore simulato')
      }
      await syncTrips()
      // Ricarico dal database locale: la sincronizzazione può aver aggiunto o aggiornato viaggi
      skipNextTripsChangeRef.current = true
      await loadTrips(tripsContextRef.current)
      setLastSyncAt(new Date())
      setHasPendingChanges(false)
      setSyncStatus('synced')
      return true
    } catch (error: any) {
      console.warn('Errore di sincronizzazione:', error, error?.stack)
      setSyncError(error?.message ?? 'Errore sconosciuto')
      setSyncStatus('error')
      return false
    }
  }, [])

  const syncNow = useCallback(async () => {
    await runSync()
  }, [runSync])

  // Sessione salvata dal telefono e cambi di stato dell'accesso
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(toAccountUser(data.session.user))
        setHasPendingChanges(true)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAccountUser(session.user) : null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setIsSigningIn(true)
    setSignInError(null)
    try {
      await googleSignIn()
      const { data } = await supabase.auth.getSession()
      const signedInUser = data.session?.user ? toAccountUser(data.session.user) : null
      Alert.alert(
        'Accesso eseguito',
        signedInUser
          ? `Sei connesso come ${signedInUser.email}. I tuoi viaggi verranno sincronizzati.`
          : 'I tuoi viaggi verranno sincronizzati.'
      )
      // Primo accesso: sincronizzo subito (carico i viaggi del telefono e scarico quelli del server)
      setHasPendingChanges(true)
      setSyncStatus('idle')
    } catch (error: any) {
      if (!(error instanceof SignInCancelledError)) {
        console.warn('Errore di accesso:', error, error?.stack)
        setSignInError(error?.message ?? 'Accesso non riuscito')
      }
    } finally {
      setIsSigningIn(false)
    }
  }, [])

  const finishSignIn = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    const signedInUser = data.session?.user ? toAccountUser(data.session.user) : null
    setHasPendingChanges(true)
    setSyncStatus('idle')
    Alert.alert(
      'Accesso eseguito',
      signedInUser
        ? `Sei connesso come ${signedInUser.email}. I tuoi viaggi verranno sincronizzati.`
        : 'I tuoi viaggi verranno sincronizzati.'
    )
  }, [])

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsSigningIn(true)
      setSignInError(null)
      try {
        await emailSignIn(email, password)
        await finishSignIn()
      } catch (error: any) {
        setSignInError(error?.message ?? 'Accesso non riuscito')
      } finally {
        setIsSigningIn(false)
      }
    },
    [finishSignIn]
  )

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name: string) => {
      setIsSigningIn(true)
      setSignInError(null)
      try {
        const needsConfirmation = await emailSignUp(email, password, name)
        if (needsConfirmation) {
          Alert.alert('Conferma la tua email', 'Ti abbiamo scritto: apri il messaggio e conferma l’indirizzo, poi accedi.')
        } else {
          await finishSignIn()
        }
      } catch (error: any) {
        setSignInError(error?.message ?? 'Registrazione non riuscita')
      } finally {
        setIsSigningIn(false)
      }
    },
    [finishSignIn]
  )

  const signOut = useCallback(
    async (force = false) => {
      // Prima invio le modifiche non ancora sincronizzate: dopo l'uscita i viaggi non sono più sul telefono
      if (!force && user) {
        const synced = await runSync()
        if (!synced) throw new Error('SYNC_FAILED')
      }
      await authSignOut()
      await clearAllTickets()
      await clearAllLocalTrips()
      await AsyncStorage.removeItem(LAST_USER_KEY)
      skipNextTripsChangeRef.current = true
      await loadTrips(tripsContextRef.current)
      setUser(null)
      setSyncStatus('idle')
      setLastSyncAt(null)
      setHasPendingChanges(false)
      setSyncError(null)
    },
    [user, runSync]
  )

  const deleteAccount = useCallback(async () => {
    await authDeleteAccount()
    await unlinkTripsFromAccount()
    await AsyncStorage.removeItem(LAST_USER_KEY)
    setUser(null)
    setSyncStatus('idle')
    setLastSyncAt(null)
    setHasPendingChanges(false)
    setSyncError(null)
  }, [])

  // Quando si accede (o si ripristina la sessione) verifico di chi sono i viaggi sul telefono: se appartengono a un
  // altro utente li tolgo prima di sincronizzare, così non si vedono né si caricano nell'account sbagliato
  useEffect(() => {
    if (!user) {
      setAccountReady(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const lastUserId = await AsyncStorage.getItem(LAST_USER_KEY)
        if (lastUserId && lastUserId !== user.id) {
          await clearAllTickets()
          await clearAllLocalTrips()
          skipNextTripsChangeRef.current = true
          await loadTrips(tripsContextRef.current)
        }
        await AsyncStorage.setItem(LAST_USER_KEY, user.id)
      } catch (error) {
        console.warn('Errore nel controllo dell’account:', error)
      } finally {
        if (!cancelled) setAccountReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Ogni modifica ai viaggi (dopo il primo caricamento) diventa una modifica da sincronizzare
  useEffect(() => {
    if (isFirstTripsRef.current) {
      isFirstTripsRef.current = false
      return
    }
    if (skipNextTripsChangeRef.current) {
      skipNextTripsChangeRef.current = false
      return
    }
    if (user) {
      setHasPendingChanges(true)
      // Una nuova modifica dopo un errore riabilita i tentativi automatici
      setSyncStatus((prev) => (prev === 'error' ? 'idle' : prev))
    }
  }, [trips])

  // Sincronizzazione automatica, con un piccolo ritardo per raggruppare più modifiche ravvicinate
  useEffect(() => {
    // Dopo un errore non ritento da solo all'infinito: serve un'azione dell'utente o una nuova modifica
    if (!user || !accountReady || !autoSync || !hasPendingChanges || syncStatus === 'syncing' || syncStatus === 'error') return
    const timer = setTimeout(syncNow, AUTO_SYNC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [user, accountReady, autoSync, hasPendingChanges, syncStatus, syncNow])

  return (
    <AccountContext.Provider
      value={{
        user,
        isSigningIn,
        signInError,
        syncError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        deleteAccount,
        syncStatus,
        lastSyncAt,
        hasPendingChanges,
        autoSync,
        setAutoSync,
        syncNow,
        simulateErrorOnNextSync: () => {
          failNextRef.current = true
        },
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export const useAccountContext = () => useContext(AccountContext)
