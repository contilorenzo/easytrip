import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAccountContext } from '../../src/state/AccountContext'
import { acceptInvite, parseInviteCode } from '../../src/services/sharing'
import { ROUTES } from '../../src/components/common/db/routes'
import { useTripsContext } from '../../src/state/TripsContext'
import { getTripByRemoteId } from '../../src/components/common/db/utils'

// Si arriva qui dal link d'invito (acme://join/CODICE): se l'utente ha fatto l'accesso accetto l'invito,
// sincronizzo e torno alla home, dove compare il viaggio condiviso.
const JoinScreen = () => {
  const { code } = useLocalSearchParams<{ code: string }>()
  const { user, syncNow } = useAccountContext()
  const tripsContext = useTripsContext()
  const [status, setStatus] = useState<'working' | 'needsLogin' | 'done' | 'error'>('working')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user) {
      setStatus('needsLogin')
      return
    }
    let cancelled = false
    setStatus('working')
    ;(async () => {
      try {
        const remoteTripId = await acceptInvite(parseInviteCode(String(code ?? '')))
        await syncNow()
        if (cancelled) return
        setStatus('done')
        // Apro direttamente il viaggio appena aggiunto; "indietro" porta alla home
        const trip = await getTripByRemoteId(remoteTripId)
        setTimeout(() => {
          router.replace('/')
          if (trip) {
            tripsContext.setCurrentTrip(trip)
            router.push(ROUTES.TRIP_DETAILS)
          }
        }, 700)
      } catch (e: any) {
        if (cancelled) return
        setMessage(e?.message ?? 'Invito non valido o scaduto.')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, code])

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {status === 'working' && (
        <>
          <ActivityIndicator size="large" color="#FF5A5F" />
          <Text style={styles.title}>Sto aprendo il viaggio…</Text>
        </>
      )}
      {status === 'done' && (
        <>
          <Ionicons name="checkmark-circle" size={54} color="#22C55E" />
          <Text style={styles.title}>Viaggio aggiunto</Text>
        </>
      )}
      {status === 'needsLogin' && (
        <>
          <Ionicons name="person-circle-outline" size={54} color="#FF5A5F" />
          <Text style={styles.title}>Accedi per unirti al viaggio</Text>
          <Text style={styles.text}>Dopo l'accesso torna a toccare il link d'invito.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace(ROUTES.SETTINGS)} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Vai all'account</Text>
          </TouchableOpacity>
        </>
      )}
      {status === 'error' && (
        <>
          <Ionicons name="alert-circle-outline" size={54} color="#EF4444" />
          <Text style={styles.title}>Non riesco ad aprire l'invito</Text>
          <Text style={styles.text}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/')} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Torna alla home</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  text: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  button: { marginTop: 8, height: 46, paddingHorizontal: 22, borderRadius: 14, backgroundColor: '#FF5A5F', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 14.5, fontWeight: '700' },
})

export default JoinScreen
