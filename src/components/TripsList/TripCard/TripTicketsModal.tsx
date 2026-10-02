import { confirmAction } from '../../../utils/confirm'
import React, { useState } from 'react'
import {
  Modal,
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Trip } from '../types'
import { CountryTheme, hexToRgba } from '../../../utils/countryTheme'
import {
  TripTicket,
  pickTicketFromLibrary,
  takeTicketPhoto,
  pickTicketDocument,
  addTripTicket,
  deleteTripTicket,
  openOrShareTicket,
} from '../../../utils/tripTickets'

interface Props {
  visible: boolean
  onClose: () => void
  trip: Trip
  tickets: TripTicket[]
  onTicketsChanged: () => void
  countryTheme: CountryTheme
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const TripTicketsModal = ({
  visible,
  onClose,
  trip,
  tickets,
  onTicketsChanged,
  countryTheme,
}: Props) => {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null)

  const handlePickLibrary = async () => {
    try {
      setLoading(true)
      const asset = await pickTicketFromLibrary()
      if (asset) {
        await addTripTicket(trip.id, asset.name, asset.uri, asset.type)
        onTicketsChanged()
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('canceled')) {
        Alert.alert('Errore', err.message || 'Impossibile selezionare l’immagine.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTakePhoto = async () => {
    try {
      setLoading(true)
      const asset = await takeTicketPhoto()
      if (asset) {
        await addTripTicket(trip.id, asset.name, asset.uri, asset.type)
        onTicketsChanged()
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('canceled')) {
        Alert.alert('Errore', err.message || 'Impossibile scattare la foto.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePickDocument = async () => {
    try {
      setLoading(true)
      const asset = await pickTicketDocument()
      if (asset) {
        await addTripTicket(trip.id, asset.name, asset.uri, asset.type)
        onTicketsChanged()
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('canceled')) {
        Alert.alert('Errore', err.message || 'Impossibile selezionare il documento.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (ticket: TripTicket) => {
    confirmAction({
      title: 'Elimina biglietto',
      message: `Sei sicuro di voler eliminare "${ticket.name}"?`,
      onConfirm: async () => {
        try {
          setLoading(true)
          await deleteTripTicket(ticket)
          onTicketsChanged()
        } catch (err) {
          Alert.alert('Errore', 'Impossibile eliminare il file.')
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleOpenFile = async (ticket: TripTicket) => {
    if (ticket.type === 'image') {
      setFullscreenImageUri(ticket.uri)
    } else {
      await openOrShareTicket(ticket)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* Su Android la finestra occupa tutto lo schermo, barra di stato compresa: serve il margine in alto */}
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 0, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Biglietti & Boarding Pass</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close-circle" size={26} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {trip.city.toUpperCase()} • {tickets.length} {tickets.length === 1 ? 'documento salvato' : 'documenti salvati'}
        </Text>

        <View style={styles.sheetBody}>
          {/* Action Buttons: Add Photo, Library, PDF */}
          <View style={styles.addButtonsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleTakePhoto}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Ionicons name="camera-outline" size={17} color="#0284C7" />
              <Text style={styles.actionBtnText}>Scatta foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handlePickLibrary}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Ionicons name="image-outline" size={17} color="#4F46E5" />
              <Text style={styles.actionBtnText}>Galleria</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handlePickDocument}
              disabled={loading}
              activeOpacity={0.75}
            >
              <Ionicons name="document-text-outline" size={17} color="#D97706" />
              <Text style={styles.actionBtnText}>File PDF</Text>
            </TouchableOpacity>
          </View>

          {/* Content Scroll View */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading && (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color={countryTheme.accentColor} />
                <Text style={styles.loadingText}>Caricamento in corso...</Text>
              </View>
            )}

            {/* Empty State */}
            {tickets.length === 0 && !loading && (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="barcode-outline" size={42} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>Nessun biglietto caricato</Text>
                <Text style={styles.emptyDesc}>
                  Carica qui lo screenshot del QR code, la carta d’imbarco, il biglietto del treno o il PDF dell’hotel per averlo subito a portata di mano!
                </Text>
              </View>
            )}

            {/* Tickets Cards List */}
            {tickets.map((ticket) => {
              const uploadDate = new Date(ticket.uploadedAt)
              const formattedDate = !isNaN(uploadDate.getTime())
                ? format(uploadDate, 'd MMM HH:mm', { locale: it })
                : ''

              return (
                <View key={ticket.id} style={styles.ticketCard}>
                  {/* Left Thumbnail or Icon */}
                  <TouchableOpacity
                    style={styles.thumbnailWrap}
                    onPress={() => handleOpenFile(ticket)}
                    activeOpacity={0.85}
                  >
                    {ticket.type === 'image' ? (
                      <Image
                        source={{ uri: ticket.uri }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.pdfThumbnail}>
                        <Ionicons name="document-text" size={28} color="#EF4444" />
                        <Text style={styles.pdfBadgeText}>PDF</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Center Details */}
                  <TouchableOpacity
                    style={styles.ticketDetails}
                    onPress={() => handleOpenFile(ticket)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.typeBadgeRow}>
                      <View
                        style={[
                          styles.typeBadge,
                          ticket.type === 'pdf'
                            ? styles.typeBadgePdf
                            : styles.typeBadgeImage,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeLabel,
                            ticket.type === 'pdf'
                              ? styles.typeBadgeLabelPdf
                              : styles.typeBadgeLabelImage,
                          ]}
                        >
                          {ticket.type === 'pdf' ? 'DOCUMENTO PDF' : 'IMMAGINE / QR'}
                        </Text>
                      </View>
                      {formattedDate ? (
                        <Text style={styles.dateUploadedText}>
                          {formattedDate}
                        </Text>
                      ) : null}
                    </View>

                    <Text
                      style={styles.ticketName}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {ticket.name}
                    </Text>

                    <View style={styles.viewRow}>
                      <Text
                        style={[
                          styles.viewActionText,
                          { color: countryTheme.accentColor },
                        ]}
                      >
                        {ticket.type === 'image' ? 'Tocca per ingrandire' : 'Apri o condividi'}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={12}
                        color={countryTheme.accentColor}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(ticket)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={17} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              )
            })}
          </ScrollView>
        </View>

        {/* Fullscreen Image Preview Modal */}
        {fullscreenImageUri && (
          <Modal
            visible={!!fullscreenImageUri}
            transparent
            animationType="fade"
            onRequestClose={() => setFullscreenImageUri(null)}
          >
            <View style={styles.fullscreenOverlay}>
              <TouchableOpacity
                style={styles.fullscreenCloseBtn}
                onPress={() => setFullscreenImageUri(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <Image
                source={{ uri: fullscreenImageUri }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />

              <View style={styles.fullscreenBottomBar}>
                <Text style={styles.fullscreenHintText}>
                  Pronto per la scansione del codice a barre o QR code
                </Text>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 24 },
  // Più margine in alto e ai lati: la finestra ha gli angoli molto arrotondati (come le altre finestre dell'app)
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, paddingBottom: 6 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 14 },
  sheetBody: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 12,
  },
  headerGradientBar: {
    width: '100%',
    height: 5,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonsRow: {
    flexDirection: 'row',
    paddingTop: 0,
    paddingBottom: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    borderRadius: 11,
    gap: 5,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  scrollView: {
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 24,
    gap: 10,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginTop: 6,
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  pdfThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  pdfBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: -2,
  },
  ticketDetails: {
    flex: 1,
    gap: 2,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  typeBadgePdf: {
    backgroundColor: '#FEE2E2',
  },
  typeBadgeImage: {
    backgroundColor: '#E0E7FF',
  },
  typeBadgeLabel: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  typeBadgeLabelPdf: {
    color: '#DC2626',
  },
  typeBadgeLabelImage: {
    color: '#4338CA',
  },
  dateUploadedText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  ticketName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  viewActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
  },

  // Fullscreen Modal
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 999,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  fullscreenBottomBar: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fullscreenHintText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
})

export default TripTicketsModal
