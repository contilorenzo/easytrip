import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { SyncStatus, useAccountContext } from '../../state/AccountContext'
import { useTripsContext } from '../../state/TripsContext'
import { confirmAction } from '../../utils/confirm'
import { KeyboardAvoider, keyboardScrollProps } from '../common/KeyboardAvoider'
import JoinTripForm from '../Account/JoinTripForm'
import UserAvatar from '../Account/UserAvatar'
import * as ImagePicker from 'expo-image-picker'
import { removeCustomPhoto, setCustomName, setCustomPhoto } from '../../services/auth'

const Settings = () => {
  const {
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
    simulateErrorOnNextSync,
  } = useAccountContext()
  const context = useTripsContext()
  const { trips } = context

  // Rinfresca ogni tanto "x minuti fa"
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const handleBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  const handleSignOut = () => {
    confirmAction({
      title: 'Esci dall’account',
      message: 'I viaggi verranno rimossi da questo dispositivo: restano nel tuo account e li ritroverai accedendo di nuovo.',
      confirmText: 'Esci',
      onConfirm: async () => {
        try {
          await signOut()
        } catch (error: any) {
          if (error?.message === 'SYNC_FAILED') {
            // Non sono riuscito a inviare le ultime modifiche: chiedo se uscire lo stesso
            confirmAction({
              title: 'Sincronizzazione non riuscita',
              message: 'Alcune modifiche non sono state inviate e uscendo andrebbero perse. Vuoi uscire comunque?',
              confirmText: 'Esci comunque',
              onConfirm: () => signOut(true),
            })
          } else {
            Alert.alert('Uscita non riuscita', error?.message ?? 'Riprova tra poco.')
          }
        }
      },
    })
  }

  const [isDeleting, setIsDeleting] = useState(false)
  const [isPhotoBusy, setIsPhotoBusy] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const saveName = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === user?.name) {
      setIsEditingName(false)
      return
    }
    try {
      await setCustomName(trimmed)
      setIsEditingName(false)
    } catch (error: any) {
      Alert.alert('Nome non aggiornato', error?.message ?? 'Riprova tra poco.')
    }
  }

  const uploadPhoto = async (result: ImagePicker.ImagePickerResult) => {
    if (!user || result.canceled) return
    setIsPhotoBusy(true)
    try {
      await setCustomPhoto(user.id, result.assets[0].uri)
    } catch (error: any) {
      Alert.alert('Foto non aggiornata', error?.message ?? 'Riprova tra poco.')
    } finally {
      setIsPhotoBusy(false)
    }
  }

  const pickOptions: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 }

  const pickPhoto = async () => {
    uploadPhoto(await ImagePicker.launchImageLibraryAsync(pickOptions))
  }

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Fotocamera non disponibile', 'Consenti l’accesso alla fotocamera dalle impostazioni del telefono.')
      return
    }
    uploadPhoto(await ImagePicker.launchCameraAsync(pickOptions))
  }

  const resetPhoto = async () => {
    setIsPhotoBusy(true)
    try {
      await removeCustomPhoto()
    } catch (error: any) {
      Alert.alert('Foto non aggiornata', error?.message ?? 'Riprova tra poco.')
    } finally {
      setIsPhotoBusy(false)
    }
  }

  const handleAvatarPress = () => {
    Alert.alert('Foto profilo', undefined, [
      { text: 'Scatta una foto', onPress: takePhoto },
      { text: 'Scegli dalla libreria', onPress: pickPhoto },
      { text: 'Usa la foto predefinita', onPress: resetPhoto },
      { text: 'Annulla', style: 'cancel' },
    ])
  }

  // Accesso con email e password
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const canSubmitEmail = email.trim().length > 3 && password.length >= 6 && !isSigningIn
  const handleEmailSubmit = () => {
    if (!canSubmitEmail) return
    if (isSignUp) signUpWithEmail(email, password, name)
    else signInWithEmail(email, password)
  }

  const handleDeleteAccount = () => {
    confirmAction({
      title: 'Eliminare l’account?',
      message: 'Account e viaggi salvati nel cloud verranno eliminati definitivamente. I viaggi presenti su questo dispositivo resteranno qui.',
      onConfirm: async () => {
        setIsDeleting(true)
        try {
          await deleteAccount()
          Alert.alert('Account eliminato', 'Il tuo account e i dati nel cloud sono stati eliminati.')
        } catch (error: any) {
          Alert.alert('Eliminazione non riuscita', error?.message ?? 'Riprova tra poco.')
        } finally {
          setIsDeleting(false)
        }
      },
    })
  }

  const tripsCount = trips?.length ?? 0

  const getStatusInfo = (status: SyncStatus): { icon: any; color: string; title: string; subtitle: string } => {
    if (status === 'syncing') {
      return { icon: 'sync', color: '#FF5A5F', title: 'Sincronizzazione in corso…', subtitle: 'Non chiudere l’app' }
    }
    if (status === 'error') {
      return {
        icon: 'cloud-offline-outline',
        color: '#EF4444',
        title: 'Sincronizzazione non riuscita',
        subtitle: syncError ?? 'I viaggi sono al sicuro sul dispositivo. Riprova tra poco.',
      }
    }
    if (hasPendingChanges) {
      return {
        icon: 'cloud-upload-outline',
        color: '#F59E0B',
        title: 'Modifiche da sincronizzare',
        subtitle: autoSync ? 'Partirà tra qualche secondo' : 'Tocca “Sincronizza ora”',
      }
    }
    if (lastSyncAt) {
      return {
        icon: 'cloud-done-outline',
        color: '#22C55E',
        title: 'Tutto sincronizzato',
        subtitle: `Ultimo aggiornamento ${formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: it })}`,
      }
    }
    return { icon: 'cloud-outline', color: '#64748B', title: 'Non ancora sincronizzato', subtitle: 'Tocca “Sincronizza ora”' }
  }

  const statusInfo = getStatusInfo(syncStatus)

  return (
    <KeyboardAvoider style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Account</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} {...keyboardScrollProps}>
        {!user ? (
          <View style={styles.card}>
            <View style={styles.heroIcon}>
              <Ionicons name="cloud-upload-outline" size={30} color="#FF5A5F" />
            </View>
            <Text style={styles.cardTitle}>Accedi a EasyTrips</Text>
            <Text style={styles.cardText}>
              Salva i tuoi itinerari nel cloud e ritrovali su ogni dispositivo, anche se cambi telefono.
            </Text>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={signInWithGoogle}
              disabled={isSigningIn}
              activeOpacity={0.85}
            >
              {isSigningIn ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <Ionicons name="logo-google" size={18} color="#EA4335" />
              )}
              <Text style={styles.googleButtonText}>{isSigningIn ? 'Accesso in corso…' : 'Continua con Google'}</Text>
            </TouchableOpacity>

            {/* Accesso con email e password */}
            <TouchableOpacity style={styles.emailToggle} onPress={() => setShowEmailForm((v) => !v)} activeOpacity={0.7}>
              <Text style={styles.emailToggleText}>{showEmailForm ? 'Nascondi' : 'Oppure continua con email'}</Text>
              <Ionicons name={showEmailForm ? 'chevron-up' : 'chevron-down'} size={14} color="#64748B" />
            </TouchableOpacity>

            {showEmailForm && (
              <View style={styles.emailForm}>
                {isSignUp && (
                  <TextInput
                    style={styles.emailInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Nome"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                  />
                )}
                <TextInput
                  style={styles.emailInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.emailInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password (almeno 6 caratteri)"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.primaryButton, !canSubmitEmail && styles.primaryButtonDisabled]}
                  onPress={handleEmailSubmit}
                  disabled={!canSubmitEmail}
                  activeOpacity={0.85}
                >
                  {isSigningIn ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{isSignUp ? 'Registrati' : 'Accedi'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsSignUp((v) => !v)} activeOpacity={0.7}>
                  <Text style={styles.emailSwitchText}>
                    {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!!signInError && <Text style={styles.errorText}>{signInError}</Text>}

            {Platform.OS === 'ios' && (
              <View style={[styles.googleButton, styles.disabledButton]}>
                <Ionicons name="logo-apple" size={19} color="#94A3B8" />
                <Text style={[styles.googleButtonText, { color: '#94A3B8' }]}>Apple — presto disponibile</Text>
              </View>
            )}

            <Text style={styles.footnote}>
              Senza account i viaggi restano solo su questo dispositivo.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.profileRow}>
                <TouchableOpacity onPress={handleAvatarPress} disabled={isPhotoBusy} activeOpacity={0.8}>
                  <UserAvatar user={user} size={48} />
                  <View style={styles.avatarEdit}>
                    {isPhotoBusy ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="camera" size={11} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  {isEditingName ? (
                    <View style={styles.nameEditRow}>
                      <TextInput
                        style={styles.nameInput}
                        value={nameDraft}
                        onChangeText={setNameDraft}
                        autoFocus
                        maxLength={40}
                        returnKeyType="done"
                        onSubmitEditing={saveName}
                      />
                      <TouchableOpacity onPress={saveName} hitSlop={8}>
                        <Ionicons name="checkmark-circle" size={26} color="#FF5A5F" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.nameEditRow}
                      onPress={() => {
                        setNameDraft(user.name)
                        setIsEditingName(true)
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.profileName, { flexShrink: 1 }]} numberOfLines={1}>{user.name}</Text>
                      <Ionicons name="pencil" size={13} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                  <Text style={styles.profileEmail}>{user.email}</Text>
                </View>
                {!isEditingName && (
                  <View style={styles.providerBadge}>
                    <Ionicons name="logo-google" size={12} color="#EA4335" />
                    <Text style={styles.providerText}>Google</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>SINCRONIZZAZIONE</Text>

              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, { backgroundColor: statusInfo.color + '1A' }]}>
                  {syncStatus === 'syncing' ? (
                    <ActivityIndicator size="small" color={statusInfo.color} />
                  ) : (
                    <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>{statusInfo.title}</Text>
                  <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, syncStatus === 'syncing' && styles.primaryButtonDisabled]}
                onPress={syncNow}
                disabled={syncStatus === 'syncing'}
                activeOpacity={0.85}
              >
                <Ionicons name="sync" size={16} color="white" />
                <Text style={styles.primaryButtonText}>Sincronizza ora</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Sincronizza automaticamente</Text>
                  <Text style={styles.switchSubtitle}>Invia le modifiche appena le fai</Text>
                </View>
                <Switch
                  value={autoSync}
                  onValueChange={setAutoSync}
                  trackColor={{ true: '#FF5A5F', false: '#CBD5E1' }}
                  thumbColor="white"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="airplane-outline" size={15} color="#64748B" />
                <Text style={styles.infoText}>
                  {tripsCount} {tripsCount === 1 ? 'viaggio' : 'viaggi'} su questo dispositivo
                </Text>
              </View>
            </View>

            <JoinTripForm title="Viaggi condivisi: hai un codice invito?" />

            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={17} color="#EF4444" />
              <Text style={styles.signOutText}>Esci</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#94A3B8" />
              ) : (
                <Text style={styles.deleteText}>Elimina account</Text>
              )}
            </TouchableOpacity>

            {__DEV__ && (
              <TouchableOpacity style={styles.devButton} onPress={simulateErrorOnNextSync} activeOpacity={0.8}>
                <Ionicons name="bug-outline" size={15} color="#64748B" />
                <Text style={styles.devButtonText}>DEV · Simula errore alla prossima sincronizzazione</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoider>
  )
}

const styles = StyleSheet.create({
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: { flex: 1, backgroundColor: '#F8F9FA' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  content: { padding: 12, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    padding: 18,
    gap: 12,
  },
  heroIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  cardText: { fontSize: 13.5, lineHeight: 20, color: '#64748B', textAlign: 'center' },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  googleButtonText: { fontSize: 14.5, fontWeight: '700', color: '#1E293B' },
  disabledButton: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  errorText: { fontSize: 12.5, color: '#EF4444', textAlign: 'center' },
  footnote: { fontSize: 11.5, color: '#94A3B8', textAlign: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileName: { fontSize: 15.5, fontWeight: '800', color: '#111827' },
  profileEmail: { fontSize: 12.5, color: '#64748B', marginTop: 1 },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  providerText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  sectionLabel: { fontSize: 11.5, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  statusSubtitle: { fontSize: 12, color: '#64748B', marginTop: 1 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
  },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: 'white', fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  switchSubtitle: { fontSize: 12, color: '#64748B', marginTop: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 12.5, color: '#64748B' },
  emailToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  emailToggleText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  emailForm: { gap: 10 },
  emailInput: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#111827',
  },
  emailSwitchText: { fontSize: 13, fontWeight: '600', color: '#FF5A5F', textAlign: 'center', paddingVertical: 4 },
  joinRow: { flexDirection: 'row', gap: 8 },
  joinInput: {
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
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
  },
  signOutText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  deleteButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  deleteText: { fontSize: 13, fontWeight: '600', color: '#94A3B8', textDecorationLine: 'underline' },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  devButtonText: { fontSize: 11.5, color: '#64748B' },
})

export default Settings
