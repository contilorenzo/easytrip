import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { Tip, TipKind, getTipsEnabled, loadTipsSettings, openAffiliateLink, subscribeTips, travelTips } from '../../services/travelTips'

interface Props {
  city: string
  countryId?: string | null
  startDate: Date
  endDate: Date
}

// Titolo breve per ogni consiglio; la città e le date restano solo nell'etichetta per l'accessibilità
const TITLE: Record<TipKind, string> = {
  experiences: 'Esperienze',
  luggage: 'Bagagli',
  car: 'Auto',
  transfer: 'Transfer',
  esim: 'eSIM',
}

const ICON: Record<TipKind, keyof typeof Ionicons.glyphMap> = {
  experiences: 'ticket-outline',
  luggage: 'briefcase-outline',
  car: 'car-outline',
  transfer: 'swap-horizontal-outline',
  esim: 'cellular-outline',
}

// Consigli di viaggio con link di affiliazione: nessun prezzo, si apre il sito del partner
const TravelTipsCard = ({ city, countryId, startDate, endDate }: Props) => {
  const [enabled, setEnabled] = useState(getTipsEnabled())
  const [tips, setTips] = useState<Tip[]>([])
  const name = city.trim()
  const dateFrom = format(startDate, 'yyyy-MM-dd')
  const dateTo = format(endDate, 'yyyy-MM-dd')

  useEffect(() => {
    loadTipsSettings().then(() => setEnabled(getTipsEnabled()))
    return subscribeTips(() => setEnabled(getTipsEnabled()))
  }, [])

  useEffect(() => {
    if (!enabled || name.length < 2 || !countryId) {
      setTips([])
      return
    }
    let active = true
    travelTips({ city: name, country: String(countryId), dateFrom, dateTo }).then((t) => active && setTips(t))
    return () => {
      active = false
    }
  }, [enabled, name, countryId, dateFrom, dateTo])

  if (!enabled || tips.length === 0) return null

  return (
    <View style={styles.card} accessibilityLabel="Consigli di viaggio">
      <Text style={styles.title}>Consigli per il viaggio</Text>
      <View style={styles.grid}>
        {tips.map((tip) => (
          <TouchableOpacity
            key={tip.kind}
            style={styles.tile}
            onPress={() => openAffiliateLink(tip.url)}
            accessibilityRole="link"
            accessibilityLabel={`${TITLE[tip.kind]} a ${name}, su ${tip.partner}`}
            activeOpacity={0.8}
          >
            <View style={styles.tileHeader}>
              <Ionicons name={ICON[tip.kind]} size={15} color="#0284C7" />
              <Text style={styles.tileTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {TITLE[tip.kind]}
              </Text>
            </View>
            <Text style={styles.tilePartner} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {tip.partner}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.disclosure}>
        <Ionicons name="information-circle-outline" size={13} color="#94A3B8" />
        <Text style={styles.disclosureText}>Link di affiliazione · potremmo ricevere una commissione se prenoti, senza costi per te.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E0F2FE', padding: 14, gap: 10 },
  title: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: 6 },
  tile: { width: '31.5%', backgroundColor: '#F0F9FF', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 9, gap: 1 },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileTitle: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  tilePartner: { fontSize: 11, color: '#64748B' },
  disclosure: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  disclosureText: { flex: 1, fontSize: 11, color: '#94A3B8', lineHeight: 15 },
})

export default TravelTipsCard
