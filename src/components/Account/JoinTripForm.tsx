import React, { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { useAccountContext } from '../../state/AccountContext'
import { useTripsContext } from '../../state/TripsContext'
import { acceptInvite, parseInviteCode } from '../../services/sharing'
import { getTripByRemoteId } from '../common/db/utils'
import { ROUTES } from '../common/db/routes'

interface Props {
  // Mostra il titolo "Viaggi condivisi" (nella schermata account); altrove basta la domanda
  title?: string
  // Sostituisce la schermata corrente invece di impilare il viaggio sopra (es. dal form di nuovo viaggio)
  replaceScreen?: boolean
}

// Inserimento del codice (o link) d'invito: accetta l'invito, sincronizza e apre il viaggio
const JoinTripForm = ({ title = 'Hai un codice invito?', replaceScreen = false }: Props) => {
  const { user, syncNow } = useAccountContext()
  const context = useTripsContext()
  const [inviteCode, setInviteCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoin = async () => {
    const code = parseInviteCode(inviteCode)
    if (!code) return
    setIsJoining(true)
    try {
      const remoteTripId = await acceptInvite(code)
      await syncNow()
      setInviteCode('')
      // Apro direttamente il viaggio appena aggiunto
      const trip = await getTripByRemoteId(remoteTripId)
      if (trip) {
        context.setCurrentTrip(trip)
        if (replaceScreen) router.replace(ROUTES.TRIP_DETAILS)
        else router.push(ROUTES.TRIP_DETAILS)
      } else {
        Alert.alert('Viaggio aggiunto', 'Lo trovi nella lista dei tuoi viaggi.')
      }
    } catch (error: any) {
      Alert.alert('Invito non valido', error?.message ?? 'Controlla il codice e riprova.')
    } finally {
      setIsJoining(false)
    }
  }

  if (!user) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Accedi al tuo account per unirti a un viaggio condiviso.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push(ROUTES.SETTINGS)} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Vai all’account</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Incolla il codice o il link che ti hanno mandato.</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Codice invito"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.joinButton, (!inviteCode.trim() || isJoining) && styles.disabled]}
          onPress={handleJoin}
          disabled={!inviteCode.trim() || isJoining}
          activeOpacity={0.85}
        >
          {isJoining ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.buttonText}>Unisciti</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  title: { fontSize: 14.5, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12.5, color: '#64748B' },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#111827',
  },
  joinButton: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: 'white', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
})

export default JoinTripForm
