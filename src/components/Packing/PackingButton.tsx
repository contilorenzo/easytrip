import React, { useCallback, useEffect, useState } from 'react'
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getPackingItems, summarizePacking } from '../../utils/tripPacking'
import PackingListModal from './PackingListModal'

interface Props {
  tripId: number
  city: string
  accentColor: string
  // Aspetto: 'card' = tondo piccolo sulle card dei viaggi
  size?: number
  // Pillola con icona e conteggio (per spazi stretti), al posto del tondo con il badge
  inline?: boolean
  style?: StyleProp<ViewStyle>
  // Colori del tondo (default: chiaro, per le card)
  backgroundColor?: string
  borderColor?: string
  iconColor?: string
  // Per aprire la modale anche dall'esterno (es. dal dettaglio del viaggio)
  render?: (open: () => void, summary: { total: number; packed: number }) => React.ReactNode
}

// Icona della valigia con il conteggio di quanto è già pronto; al tocco apre la lista
const PackingButton = ({ tripId, city, accentColor, size = 30, inline = false, style, backgroundColor, borderColor, iconColor, render }: Props) => {
  const [visible, setVisible] = useState(false)
  const [summary, setSummary] = useState({ total: 0, packed: 0 })

  const load = useCallback(async () => {
    setSummary(summarizePacking(await getPackingItems(tripId)))
  }, [tripId])

  useEffect(() => {
    load()
  }, [load])

  const done = summary.total > 0 && summary.packed === summary.total
  const tint = done ? '#16A34A' : accentColor

  return (
    <>
      {render ? (
        render(() => setVisible(true), summary)
      ) : (
        <TouchableOpacity
          style={[
            styles.button,
            inline && styles.inline,
            inline ? { height: size, borderRadius: size / 2 } : { width: size, height: size, borderRadius: size / 2 },
            backgroundColor ? { backgroundColor } : undefined,
            borderColor ? { borderColor } : undefined,
            style,
          ]}
          onPress={(e) => {
            e.stopPropagation?.()
            setVisible(true)
          }}
          activeOpacity={0.75}
          accessibilityLabel="Lista valigia"
          hitSlop={6}
        >
          <Ionicons name={done ? 'bag-check' : 'bag-handle'} size={Math.round(size * 0.55)} color={iconColor || tint} />
          {inline && summary.total > 0 && (
            <Text style={[styles.inlineText, { color: tint }]}>{summary.packed}/{summary.total}</Text>
          )}
          {!inline && summary.total > 0 && (
            <View style={[styles.badge, { backgroundColor: tint }]}>
              <Text style={styles.badgeText}>{done ? '✓' : `${summary.packed}/${summary.total}`}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      <PackingListModal
        visible={visible}
        onClose={() => setVisible(false)}
        tripId={tripId}
        city={city}
        accentColor={accentColor}
        onChanged={load}
      />
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inline: { flexDirection: 'row', gap: 3, paddingHorizontal: 7 },
  inlineText: { fontSize: 10.5, fontWeight: '800' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 18,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: { fontSize: 8.5, fontWeight: '900', color: '#FFFFFF' },
})

export default PackingButton
