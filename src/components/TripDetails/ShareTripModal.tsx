import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Trip } from '../TripsList/types'
import { useAccountContext } from '../../state/AccountContext'
import {
  createInvite,
  InviteRole,
  inviteLink,
  listMembers,
  removeMember,
  setMemberRole,
  TripMember,
} from '../../services/sharing'
import UserAvatar from '../Account/UserAvatar'
import { roleLabel } from '../../utils/tripRole'
import { confirmAction } from '../../utils/confirm'
import { ROUTES } from '../common/db/routes'

interface Props {
  visible: boolean
  trip: Trip
  onClose: () => void
  // Solo elenco dei partecipanti, senza inviti né gestione (per chi non è il proprietario)
  readOnly?: boolean
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

// Condivisione del viaggio: inviti con ruolo (modifica / sola lettura) ed elenco delle persone con accesso
const ShareTripModal = ({ visible, trip, onClose, readOnly = false }: Props) => {
  const insets = useSafeAreaInsets()
  const { user, syncNow } = useAccountContext()
  const [members, setMembers] = useState<TripMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [busyRole, setBusyRole] = useState<InviteRole | null>(null)
  const [error, setError] = useState('')

  const remoteId = trip.remoteId

  const loadMembers = useCallback(async () => {
    if (!remoteId) return
    setIsLoading(true)
    try {
      setMembers(await listMembers(remoteId))
      setError('')
    } catch (e: any) {
      setError(e?.message ?? 'Non riesco a leggere chi ha accesso al viaggio.')
    } finally {
      setIsLoading(false)
    }
  }, [remoteId])

  useEffect(() => {
    if (visible && user) loadMembers()
  }, [visible, user, loadMembers])

  const handleInvite = async (role: InviteRole) => {
    if (!remoteId) return
    setBusyRole(role)
    try {
      const code = await createInvite(remoteId, role)
      const permission = role === 'editor' ? 'potrai modificarlo' : 'potrai solo consultarlo'
      await Share.share({
        message:
          `Ti invito al mio viaggio a ${trip.city} su EasyTrips: ${permission}.\n\n` +
          `Apri il link: ${inviteLink(code)}\n` +
          `Oppure inserisci il codice ${code} nella sezione Account dell'app.\n` +
          `L'invito vale 7 giorni.`,
      })
    } catch (e: any) {
      Alert.alert('Invito non creato', e?.message ?? 'Riprova tra poco.')
    } finally {
      setBusyRole(null)
    }
  }

  const handleSyncFirst = async () => {
    setIsLoading(true)
    await syncNow()
    setIsLoading(false)
  }

  const handleMemberPress = (member: TripMember) => {
    if (readOnly || member.is_owner) return
    Alert.alert(member.name, `${member.email ?? ''}\nOra: ${roleLabel(member.role)}`, [
      {
        text: 'Può modificare',
        onPress: async () => {
          await setMemberRole(remoteId as string, member.user_id, 'editor').catch((e) => Alert.alert('Errore', e.message))
          loadMembers()
        },
      },
      {
        text: 'Solo lettura',
        onPress: async () => {
          await setMemberRole(remoteId as string, member.user_id, 'viewer').catch((e) => Alert.alert('Errore', e.message))
          loadMembers()
        },
      },
      {
        text: 'Rimuovi accesso',
        style: 'destructive',
        onPress: () =>
          confirmAction({
            title: 'Rimuovere l’accesso?',
            message: `${member.name} non vedrà più il viaggio.`,
            confirmText: 'Rimuovi',
            onConfirm: async () => {
              await removeMember(remoteId as string, member.user_id).catch((e) => Alert.alert('Errore', e.message))
              loadMembers()
            },
          }),
      },
      { text: 'Annulla', style: 'cancel' },
    ])
  }

  const renderBody = () => {
    if (!user) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardText}>Per condividere un viaggio devi accedere con il tuo account.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              onClose()
              router.push(ROUTES.SETTINGS)
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>Vai all’account</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (!remoteId) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardText}>Il viaggio non è ancora stato salvato nel cloud: serve prima una sincronizzazione.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSyncFirst} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Sincronizza ora</Text>}
          </TouchableOpacity>
        </View>
      )
    }

    return (
      <>
        {!readOnly && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>INVITA QUALCUNO</Text>
          <Text style={styles.cardText}>Scegli cosa potrà fare. Ti si apre il menu di condivisione del telefono.</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity style={styles.roleButton} onPress={() => handleInvite('editor')} disabled={!!busyRole} activeOpacity={0.85}>
              {busyRole === 'editor' ? <ActivityIndicator color="#FF5A5F" /> : <Ionicons name="create-outline" size={22} color="#FF5A5F" />}
              <Text style={styles.roleTitle}>Può modificare</Text>
              <Text style={styles.roleSub}>Tappe e date</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roleButton} onPress={() => handleInvite('viewer')} disabled={!!busyRole} activeOpacity={0.85}>
              {busyRole === 'viewer' ? <ActivityIndicator color="#0284C7" /> : <Ionicons name="eye-outline" size={22} color="#0284C7" />}
              <Text style={styles.roleTitle}>Solo lettura</Text>
              <Text style={styles.roleSub}>Può solo guardare</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{readOnly ? 'PARTECIPANTI' : 'PERSONE CON ACCESSO'}</Text>
          {readOnly && (
            <Text style={styles.cardText}>
              {trip.role === 'viewer'
                ? 'Per modificare il viaggio o aggiungere partecipanti chiedi all’organizzatore.'
                : 'Per aggiungere partecipanti chiedi all’organizzatore.'}
            </Text>
          )}
          {isLoading && members.length === 0 ? <ActivityIndicator color="#FF5A5F" /> : null}
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {members.map((member) => (
            <TouchableOpacity
              key={member.user_id}
              style={styles.memberRow}
              onPress={() => handleMemberPress(member)}
              activeOpacity={readOnly || member.is_owner ? 1 : 0.7}
            >
              <UserAvatar
                user={{ name: member.name || member.email || '?', photoUrl: member.photo_url }}
                size={36}
                textColor="#FF5A5F"
                backgroundColor="#FFE9EA"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.name}
                  {member.user_id === user.id ? ' (tu)' : ''}
                </Text>
                {!!member.email && (
                  <Text style={styles.memberEmail} numberOfLines={1}>
                    {member.email}
                  </Text>
                )}
              </View>
              {member.role !== 'viewer' && (
                <View style={[styles.rolePill, member.is_owner && styles.rolePillOwner]}>
                  <Text style={[styles.rolePillText, member.is_owner && styles.rolePillOwnerText]}>
                    {member.role === 'editor' ? 'Admin' : roleLabel(member.role)}
                  </Text>
                </View>
              )}
              {!readOnly && !member.is_owner && <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />}
            </TouchableOpacity>
          ))}
          {!isLoading && members.length <= 1 && !error && (
            <Text style={styles.hint}>
              {readOnly ? 'Nessun altro partecipante.' : 'Ancora nessuno oltre a te. Gli inviti accettati compariranno qui.'}
            </Text>
          )}
        </View>
      </>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* Su Android la finestra occupa tutto lo schermo, barra di stato compresa: serve il margine in alto */}
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 0, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{readOnly ? 'Partecipanti' : 'Condividi il viaggio'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close-circle" size={26} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          {renderBody()}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 24 },
  // Più margine in alto e ai lati: la finestra ha gli angoli molto arrotondati
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionLabel: { fontSize: 11.5, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5 },
  cardText: { fontSize: 13.5, color: '#475569', lineHeight: 19 },
  primaryButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: 'white', fontSize: 14.5, fontWeight: '700' },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  roleTitle: { fontSize: 13.5, fontWeight: '800', color: '#111827' },
  roleSub: { fontSize: 11.5, color: '#6B7280' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#FF5A5F' },
  memberName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  memberEmail: { fontSize: 12, color: '#6B7280' },
  rolePill: { backgroundColor: '#F1F5F9', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  rolePillOwner: { backgroundColor: '#FFF1F2' },
  rolePillText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  rolePillOwnerText: { color: '#FF5A5F' },
  hint: { fontSize: 12.5, color: '#94A3B8' },
  errorText: { fontSize: 12.5, color: '#EF4444' },
})

export default ShareTripModal
