import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  CUSTOM_CATEGORY_ID,
  PACKING_CATALOG,
  PACKING_CATEGORIES,
  PackingCatalogItem,
  getPackingCategory,
  searchPackingCatalog,
} from '../../data/packingCatalog'
import {
  PackingItem,
  addPackingItems,
  getPackingItems,
  removePackingItems,
  resetPackedItems,
  setPackingItemPacked,
} from '../../utils/tripPacking'
import { confirmAction } from '../../utils/confirm'

interface Props {
  visible: boolean
  onClose: () => void
  tripId: number
  city: string
  accentColor: string
  // Chiamata a ogni modifica, per aggiornare i conteggi fuori dalla modale
  onChanged?: () => void
}

type Tab = 'list' | 'add'

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

// Nomi del catalogo normalizzati, per capire se quello che scrive l'utente esiste già
const CATALOG_NAMES = new Set(PACKING_CATALOG.map((c) => normalize(c.name)))

const PackingListModal = ({ visible, onClose, tripId, city, accentColor, onChanged }: Props) => {
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<PackingItem[]>([])
  const [tab, setTab] = useState<Tab>('list')
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setItems(await getPackingItems(tripId))
  }, [tripId])

  useEffect(() => {
    if (!visible) return
    setQuery('')
    setCategoryId(null)
    getPackingItems(tripId).then((list) => {
      setItems(list)
      // Con la valigia ancora vuota si parte direttamente dal catalogo
      setTab(list.length === 0 ? 'add' : 'list')
    })
  }, [visible, tripId])

  const changed = async () => {
    await reload()
    onChanged?.()
  }

  const packedCount = items.filter((i) => i.packed).length
  const progress = items.length === 0 ? 0 : packedCount / items.length
  const allPacked = items.length > 0 && packedCount === items.length

  // ---- Lista del viaggio ----
  const listSections = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    const filtered = items.filter((i) => words.every((w) => normalize(i.name).includes(w)))
    return PACKING_CATEGORIES.map((cat) => ({
      cat,
      data: filtered
        .filter((i) => i.categoryId === cat.id)
        // Quelle già messe in valigia scendono in fondo
        .sort((a, b) => Number(a.packed) - Number(b.packed) || a.id - b.id),
    })).filter((s) => s.data.length > 0)
  }, [items, query])

  const togglePacked = async (item: PackingItem) => {
    // Aggiornamento immediato, poi si salva
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, packed: !i.packed } : i)))
    await setPackingItemPacked(item, !item.packed)
    onChanged?.()
  }

  const removeItem = async (item: PackingItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    await removePackingItems(tripId, [item.id])
    onChanged?.()
  }

  const handleReset = () => {
    confirmAction({
      title: 'Togliere tutte le spunte?',
      message: 'Le cose restano nella lista, ma risulteranno da preparare.',
      confirmText: 'Azzera',
      destructive: false,
      onConfirm: async () => {
        await resetPackedItems(tripId)
        await changed()
      },
    })
  }

  // ---- Catalogo ----
  const inListByCatalogId = useMemo(() => {
    const map = new Map<string, PackingItem>()
    items.forEach((i) => i.catalogId && map.set(i.catalogId, i))
    return map
  }, [items])

  const results = useMemo(() => searchPackingCatalog(query, categoryId), [query, categoryId])

  const trimmedQuery = query.trim()
  const hasExactMatch = useMemo(() => {
    if (!trimmedQuery) return true
    const q = normalize(trimmedQuery)
    return CATALOG_NAMES.has(q) || items.some((i) => normalize(i.name) === q)
  }, [trimmedQuery, items])

  const toggleCatalogItem = async (entry: PackingCatalogItem) => {
    const existing = inListByCatalogId.get(entry.id)
    if (existing) {
      await removePackingItems(tripId, [existing.id])
    } else {
      await addPackingItems(tripId, [{ catalogId: entry.id, name: entry.name, categoryId: entry.categoryId }])
    }
    await changed()
  }

  const addCustom = async () => {
    if (!trimmedQuery) return
    await addPackingItems(tripId, [
      {
        catalogId: null,
        name: trimmedQuery.charAt(0).toUpperCase() + trimmedQuery.slice(1),
        categoryId: categoryId || CUSTOM_CATEGORY_ID,
      },
    ])
    setQuery('')
    Keyboard.dismiss()
    await changed()
  }

  const addAllVisible = async () => {
    const toAdd = results.filter((r) => !inListByCatalogId.has(r.id))
    await addPackingItems(
      tripId,
      toAdd.map((r) => ({ catalogId: r.id, name: r.name, categoryId: r.categoryId }))
    )
    await changed()
  }

  const missingVisible = results.filter((r) => !inListByCatalogId.has(r.id)).length

  const resultSections = useMemo(() => {
    // Con una categoria scelta o una ricerca aperta mostro tutto in un blocco per categoria
    return PACKING_CATEGORIES.map((cat) => ({ cat, data: results.filter((r) => r.categoryId === cat.id) })).filter(
      (s) => s.data.length > 0
    )
  }, [results])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Intestazione */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Valigia</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {city}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Chiudi">
            <Ionicons name="close-circle" size={30} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Avanzamento */}
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressTitle}>
              {items.length === 0
                ? 'Nessun oggetto in lista'
                : allPacked
                ? 'Valigia pronta! 🎉'
                : `${packedCount} di ${items.length} in valigia`}
            </Text>
            {items.length > 0 && <Text style={[styles.progressPct, { color: accentColor }]}>{Math.round(progress * 100)}%</Text>}
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: allPacked ? '#16A34A' : accentColor }]} />
          </View>
        </View>

        {/* Schede */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'list' && { backgroundColor: accentColor, borderColor: accentColor }]}
            onPress={() => {
              setTab('list')
              setQuery('')
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="bag-check-outline" size={16} color={tab === 'list' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.tabText, tab === 'list' && styles.tabTextActive]}>La mia lista</Text>
            {items.length > 0 && (
              <View style={[styles.tabBadge, tab === 'list' && { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
                <Text style={[styles.tabBadgeText, tab === 'list' && { color: '#FFFFFF' }]}>{items.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'add' && { backgroundColor: accentColor, borderColor: accentColor }]}
            onPress={() => {
              setTab('add')
              setQuery('')
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={17} color={tab === 'add' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.tabText, tab === 'add' && styles.tabTextActive]}>Aggiungi</Text>
          </TouchableOpacity>
        </View>

        {/* Ricerca */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={tab === 'add' ? 'Cerca tra oltre 500 oggetti…' : 'Cerca nella tua lista…'}
            placeholderTextColor="#94A3B8"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="never"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {tab === 'add' && (
          <View style={{ marginBottom: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} keyboardShouldPersistTaps="handled">
              <CategoryChip label="Tutte" active={categoryId === null} color={accentColor} onPress={() => setCategoryId(null)} />
              {PACKING_CATEGORIES.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  label={cat.label}
                  icon={cat.icon}
                  active={categoryId === cat.id}
                  color={cat.color}
                  onPress={() => setCategoryId(categoryId === cat.id ? null : cat.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {tab === 'list' ? (
            <>
              {items.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="bag-handle-outline" size={42} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>La valigia è vuota</Text>
                  <Text style={styles.emptyText}>Scegli cosa portare dal catalogo: poi, mentre prepari il bagaglio, spunta quello che hai già messo.</Text>
                  <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: accentColor }]} onPress={() => setTab('add')} activeOpacity={0.85}>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.emptyBtnText}>Aggiungi oggetti</Text>
                  </TouchableOpacity>
                </View>
              ) : listSections.length === 0 ? (
                <Text style={styles.message}>Nessun oggetto nella lista corrisponde a “{trimmedQuery}”.</Text>
              ) : (
                listSections.map(({ cat, data }) => (
                  <View key={cat.id} style={styles.section}>
                    <SectionHeader
                      label={cat.label}
                      icon={cat.icon}
                      color={cat.color}
                      right={`${data.filter((i) => i.packed).length}/${data.length}`}
                    />
                    <View style={styles.card}>
                      {data.map((item, index) => (
                        <View key={item.id} style={[styles.itemRow, index > 0 && styles.itemDivider]}>
                          <TouchableOpacity style={styles.itemMain} onPress={() => togglePacked(item)} activeOpacity={0.6}>
                            <View style={[styles.checkbox, item.packed && { backgroundColor: '#16A34A', borderColor: '#16A34A' }]}>
                              {item.packed && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                            </View>
                            <Text style={[styles.itemName, item.packed && styles.itemNamePacked]} numberOfLines={2}>
                              {item.name}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeItem(item)} hitSlop={10} accessibilityLabel={`Rimuovi ${item.name}`}>
                            <Ionicons name="close" size={18} color="#CBD5E1" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}

              {packedCount > 0 && (
                <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
                  <Ionicons name="refresh" size={14} color="#64748B" />
                  <Text style={styles.resetText}>Azzera le spunte</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {/* Oggetto personalizzato: se quello che scrivi non è nell'elenco */}
              {trimmedQuery.length > 0 && !hasExactMatch && (
                <TouchableOpacity style={[styles.customRow, { borderColor: accentColor }]} onPress={addCustom} activeOpacity={0.8}>
                  <View style={[styles.customIcon, { backgroundColor: accentColor }]}>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.customText} numberOfLines={2}>
                    Aggiungi “{trimmedQuery}”
                  </Text>
                </TouchableOpacity>
              )}

              {missingVisible > 1 && (query.length > 0 || categoryId !== null) && (
                <TouchableOpacity style={styles.addAllBtn} onPress={addAllVisible} activeOpacity={0.7}>
                  <Ionicons name="checkmark-done" size={16} color={accentColor} />
                  <Text style={[styles.addAllText, { color: accentColor }]}>Aggiungi tutti i {missingVisible} risultati</Text>
                </TouchableOpacity>
              )}

              {resultSections.length === 0 && trimmedQuery.length > 0 ? (
                <Text style={styles.message}>Nessun risultato. Puoi aggiungerlo come oggetto personalizzato qui sopra.</Text>
              ) : (
                resultSections.map(({ cat, data }) => (
                  <View key={cat.id} style={styles.section}>
                    <SectionHeader label={cat.label} icon={cat.icon} color={cat.color} right={String(data.length)} />
                    <View style={styles.card}>
                      {data.map((entry, index) => {
                        const selected = inListByCatalogId.has(entry.id)
                        return (
                          <TouchableOpacity
                            key={entry.id}
                            style={[styles.itemRow, styles.itemMain, index > 0 && styles.itemDivider]}
                            onPress={() => toggleCatalogItem(entry)}
                            activeOpacity={0.6}
                          >
                            <View style={[styles.checkbox, selected && { backgroundColor: accentColor, borderColor: accentColor }]}>
                              {selected && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                            </View>
                            <Text style={styles.itemName} numberOfLines={2}>
                              {entry.name}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const SectionHeader = ({ label, icon, color, right }: { label: string; icon: any; color: string; right: string }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIcon, { backgroundColor: color + '1A' }]}>
      <Ionicons name={icon} size={14} color={color} />
    </View>
    <Text style={styles.sectionTitle}>{label}</Text>
    <Text style={styles.sectionCount}>{right}</Text>
  </View>
)

const CategoryChip = ({
  label,
  icon,
  active,
  color,
  onPress,
}: {
  label: string
  icon?: any
  active: boolean
  color: string
  onPress: () => void
}) => (
  <TouchableOpacity
    style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {icon && <Ionicons name={icon} size={14} color={active ? '#FFFFFF' : color} />}
    <Text style={[styles.chipText, active && { color: '#FFFFFF' }]}>{label}</Text>
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 24, paddingBottom: 12, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 1 },
  progressCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EEF2F6', marginBottom: 12 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  progressPct: { fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabText: { fontSize: 13.5, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  tabBadge: { minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: Platform.OS === 'android' ? 4 : 0 },
  chipsRow: { gap: 8, paddingRight: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipText: { fontSize: 12.5, fontWeight: '700', color: '#475569' },
  section: { marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, paddingHorizontal: 2 },
  sectionIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: 12.5, fontWeight: '800', color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase' },
  sectionCount: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEF2F6', overflow: 'hidden' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  itemNamePacked: { color: '#94A3B8', textDecorationLine: 'line-through' },
  empty: { alignItems: 'center', paddingTop: 36, paddingHorizontal: 20, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginTop: 4 },
  emptyText: { fontSize: 13.5, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, height: 44, borderRadius: 22, marginTop: 10 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
  message: { fontSize: 13.5, color: '#64748B', textAlign: 'center', marginTop: 28, paddingHorizontal: 20, lineHeight: 20 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, padding: 10 },
  resetText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', padding: 12, marginTop: 4 },
  customIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  customText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  addAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', paddingVertical: 8 },
  addAllText: { fontSize: 13, fontWeight: '800' },
})

export default PackingListModal
