import React, { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Place, searchPlaces, setFlightOrigin } from '../../services/flightSuggestions'

interface Props {
  visible: boolean
  onClose: () => void
}

// Scelta dell'aeroporto o della città di partenza, ricordata nelle impostazioni
const OriginPickerModal = ({ visible, onClose }: Props) => {
  const [term, setTerm] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!visible) {
      setTerm('')
      setPlaces([])
      setFailed(false)
    }
  }, [visible])

  useEffect(() => {
    if (term.trim().length < 2) {
      setPlaces([])
      setFailed(false)
      return
    }
    let active = true
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const result = await searchPlaces(term)
        if (active) {
          setPlaces(result)
          setFailed(false)
        }
      } catch {
        if (active) setFailed(true)
      } finally {
        if (active) setLoading(false)
      }
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [term])

  const choose = async (place: Place) => {
    await setFlightOrigin(place)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Da dove parti?</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi">
            <Ionicons name="close-circle" size={30} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Scegli la città o l’aeroporto di partenza: lo ricorderemo per i prossimi viaggi (modificabile dalle impostazioni).</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color="#94A3B8" />
          <TextInput
            style={styles.input}
            value={term}
            onChangeText={setTerm}
            placeholder="Cerca città o aeroporto"
            placeholderTextColor="#94A3B8"
            autoFocus
            autoCorrect={false}
            accessibilityLabel="Cerca città o aeroporto di partenza"
          />
          {loading && <ActivityIndicator size="small" color="#94A3B8" />}
        </View>

        <FlatList
          data={places}
          keyExtractor={(p) => `${p.type}-${p.code}`}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <>
              {term.trim().length >= 2 && !loading && (
                <Text style={styles.message}>
                  {failed ? 'Ricerca non disponibile. Controlla la connessione e riprova.' : 'Nessun risultato.'}
                </Text>
              )}
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => choose(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.countryName}, codice ${item.code}`}
            >
              <View style={styles.icon}>
                <Ionicons name={item.type === 'airport' ? 'airplane' : 'business'} size={16} color="#FF5A5F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.type === 'airport' ? `${item.name} (${item.cityName})` : item.name}</Text>
                <Text style={styles.meta}>{item.countryName}</Text>
              </View>
              <Text style={styles.code}>{item.code}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#64748B', lineHeight: 18, marginTop: 6, marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, height: 46, marginBottom: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  code: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  message: { fontSize: 13.5, color: '#64748B', textAlign: 'center', marginTop: 24 },
})

export default OriginPickerModal
