import React, { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format, formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { FlightOffer, FlightResult, openAffiliateLink } from '../../services/flightSuggestions'
import { useFlightSettings, useFlightSuggestion } from './useFlightSuggestion'
import OriginPickerModal from './OriginPickerModal'

interface Props {
  city: string
  countryId?: string | null
  startDate: Date
  endDate: Date
  // Versione più discreta, per la creazione del viaggio
  compact?: boolean
}

const money = (offer: FlightOffer) => {
  try {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: offer.currency, maximumFractionDigits: 0 }).format(offer.price)
  } catch {
    return `${offer.price} ${offer.currency}`
  }
}

const shortDate = (iso: string) => format(new Date(iso.slice(0, 10) + 'T12:00:00'), 'd MMM', { locale: it })

const describe = (offer: FlightOffer) => {
  const dates = offer.returnAt ? `${shortDate(offer.departureAt)} → ${shortDate(offer.returnAt)}` : shortDate(offer.departureAt)
  const stops = offer.transfers === undefined ? '' : offer.transfers === 0 ? ' · diretto' : ` · ${offer.transfers} ${offer.transfers === 1 ? 'scalo' : 'scali'}`
  return `${offer.returnAt ? 'Andata e ritorno' : 'Solo andata'} · ${dates}${stops}`
}

const errorText = (reason: string) => {
  switch (reason) {
    case 'offline':
      return 'Sei offline: i prezzi dei voli non sono disponibili per ora.'
    case 'rate_limit':
      return 'Troppe richieste in poco tempo: riprova tra qualche minuto.'
    default:
      return 'Suggerimenti voli non disponibili al momento.'
  }
}

// Ricerca in tempo reale sul sito del partner per le date scelte (il prezzo si vede lì)
const SearchButton = ({ url }: { url: string }) => (
  <TouchableOpacity
    style={styles.cta}
    onPress={() => openAffiliateLink(url)}
    activeOpacity={0.85}
    accessibilityRole="link"
    accessibilityLabel="Cerca questi voli sul sito del partner"
  >
    <Text style={styles.ctaText}>Cerca questi voli sul sito del partner</Text>
    <Ionicons name="open-outline" size={16} color="#FFFFFF" />
  </TouchableOpacity>
)

// Suggerimento voli con prezzo indicativo e link di affiliazione. Unica implementazione, usata nel dettaglio e nella creazione del viaggio.
const FlightSuggestionCard = ({ city, countryId, startDate, endDate, compact }: Props) => {
  const state = useFlightSuggestion({ city, countryId, startDate, endDate })
  const { origin } = useFlightSettings()
  const [pickerOpen, setPickerOpen] = useState(false)

  if (state.kind === 'hidden') return null

  const renderResult = (result: FlightResult) => {
    if (result.status === 'ok') {
      const { exact, alternative, quote, stale, searchUrl } = result
      const updated = formatDistanceToNow(new Date(quote.fetchedAt), { addSuffix: true, locale: it })
      const chosen = `${format(startDate, 'd MMM', { locale: it })} → ${format(endDate, 'd MMM', { locale: it })}`
      return (
        <>
          {exact ? (
            <>
              <View style={styles.priceRow} accessible accessibilityLabel={`Prezzo indicativo per le tue date: ${money(exact)}. ${describe(exact)}`}>
                <Text style={styles.from}>da</Text>
                <Text style={styles.price}>{money(exact)}</Text>
              </View>
              <Text style={styles.detail}>{describe(exact)}</Text>
              <TouchableOpacity
                style={styles.cta}
                onPress={() => openAffiliateLink(exact.url)}
                activeOpacity={0.85}
                accessibilityRole="link"
                accessibilityLabel="Vedi i voli sul sito del partner"
              >
                <Text style={styles.ctaText}>Vedi i voli sul sito del partner</Text>
                <Ionicons name="open-outline" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.detail}>Nessun prezzo indicativo per le tue date ({chosen}).</Text>
              {searchUrl && <SearchButton url={searchUrl} />}
            </>
          )}

          {alternative && (
            <View style={styles.altBox}>
              <View style={styles.altHeader}>
                <Ionicons name="trending-down" size={16} color="#16A34A" />
                <Text style={styles.altTitle}>{exact ? 'Più economico in altre date' : 'Disponibile in altre date'}</Text>
              </View>
              <Text style={styles.altPrice}>{money(alternative)}</Text>
              <Text style={styles.altDetail}>{describe(alternative)}</Text>
              <TouchableOpacity
                style={styles.altCta}
                onPress={() => openAffiliateLink(alternative.url)}
                activeOpacity={0.85}
                accessibilityRole="link"
                accessibilityLabel={`Vedi le date alternative, ${money(alternative)}, ${describe(alternative)}`}
              >
                <Text style={styles.altCtaText}>Vedi queste date sul sito del partner</Text>
                <Ionicons name="open-outline" size={14} color="#166534" />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.note}>
            Prezzo indicativo, da verificare sul sito del partner · {stale ? 'ultimo aggiornamento disponibile ' : 'aggiornato '}
            {updated}
            {stale ? ' (sei offline o il servizio non risponde)' : ''}
          </Text>
        </>
      )
    }
    if (result.status === 'empty') {
      return (
        <>
          <Text style={styles.detail}>Nessun prezzo indicativo disponibile per queste date.</Text>
          {result.searchUrl && <SearchButton url={result.searchUrl} />}
        </>
      )
    }
    return <Text style={styles.detail}>{errorText(result.reason)}</Text>
  }

  return (
    <View style={[styles.card, compact && styles.cardCompact]} accessibilityLabel="Suggerimento voli">
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="airplane" size={16} color="#0284C7" />
        </View>
        <Text style={styles.title}>Trova un volo per {city.trim()}</Text>
      </View>

      {state.kind === 'needs-origin' && (
        <>
          <Text style={styles.detail}>Dimmi da dove parti e ti mostro i prezzi più bassi indicativi.</Text>
          <TouchableOpacity style={styles.cta} onPress={() => setPickerOpen(true)} accessibilityRole="button">
            <Ionicons name="location" size={16} color="#FFFFFF" />
            <Text style={styles.ctaText}>Scegli la partenza</Text>
          </TouchableOpacity>
        </>
      )}

      {state.kind === 'loading' && (
        <View style={styles.loading} accessibilityLabel="Cerco i prezzi più bassi">
          <ActivityIndicator size="small" color="#0284C7" />
          <Text style={styles.detail}>Cerco i prezzi più bassi…</Text>
        </View>
      )}

      {state.kind === 'result' && renderResult(state.result)}

      {(state.kind === 'result' || state.kind === 'loading') && origin && (
        <TouchableOpacity onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel={`Partenza da ${origin.cityName}. Cambia`} hitSlop={8}>
          <Text style={styles.origin}>
            Partenza da {origin.cityName} ({origin.code}) · <Text style={styles.originLink}>Cambia</Text>
          </Text>
        </TouchableOpacity>
      )}

      {/* Trasparenza: il link porta a un partner commerciale */}
      <View style={styles.disclosure}>
        <Ionicons name="information-circle-outline" size={13} color="#94A3B8" />
        <Text style={styles.disclosureText}>Link di affiliazione · potremmo ricevere una commissione se prenoti, senza costi per te.</Text>
      </View>

      <OriginPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E0F2FE', padding: 14, gap: 8 },
  cardCompact: { padding: 12, gap: 6, borderRadius: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0F172A' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  from: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  price: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  detail: { fontSize: 13, color: '#475569', lineHeight: 18 },
  altBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, gap: 2 },
  altHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  altTitle: { fontSize: 12.5, fontWeight: '800', color: '#166534' },
  altPrice: { fontSize: 20, fontWeight: '900', color: '#14532D' },
  altDetail: { fontSize: 12.5, color: '#166534' },
  altCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  altCtaText: { fontSize: 12.5, fontWeight: '800', color: '#166534' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0284C7', borderRadius: 12, height: 44, marginTop: 2 },
  ctaText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  note: { fontSize: 11.5, color: '#64748B', lineHeight: 16 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  origin: { fontSize: 12, color: '#64748B' },
  originLink: { color: '#0284C7', fontWeight: '800' },
  disclosure: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 2 },
  disclosureText: { flex: 1, fontSize: 11, color: '#94A3B8', lineHeight: 15 },
})

export default FlightSuggestionCard
