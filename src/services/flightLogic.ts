// Logica pura dei suggerimenti voli (nessuna dipendenza da React Native), così si può testare con `npm test`.

export interface FlightOffer {
  price: number
  currency: string
  airline?: string
  // Date in formato ISO (YYYY-MM-DD o data e ora)
  departureAt: string
  returnAt?: string
  // Scali (0 = diretto)
  transfers?: number
  // Link di affiliazione già pronto, costruito dal server con il marker
  url: string
}

export interface FlightQuote {
  offers: FlightOffer[]
  // Link di ricerca (con affiliazione) per le date scelte, senza prezzo
  searchUrl?: string
  // Quando abbiamo ottenuto questi prezzi dal server (ISO)
  fetchedAt: string
}

export type FlightFailure = 'offline' | 'rate_limit' | 'unavailable' | 'not_configured'

export type FlightResult =
  // exact: volo per le date scelte; alternative: il più economico in altre date (solo se esiste e costa meno)
  | { status: 'ok'; quote: FlightQuote; exact?: FlightOffer; alternative?: FlightOffer; searchUrl?: string; stale: boolean }
  | { status: 'empty'; searchUrl?: string }
  | { status: 'error'; reason: FlightFailure }

export interface FlightQuery {
  origin: string
  destination: string
  // Intervallo di date del viaggio (YYYY-MM-DD)
  dateFrom: string
  dateTo: string
}

// Errore noto con un motivo, lanciato dal livello che parla col server
export class FlightError extends Error {
  constructor(public reason: FlightFailure, message?: string) {
    super(message ?? reason)
  }
}

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

// Per quanto tempo un risultato è considerato fresco (i prezzi arrivano comunque da una cache di 2-7 giorni)
export const CACHE_TTL_MS = 12 * 60 * 60 * 1000

const IATA = /^[A-Z]{3}$/

export const isIata = (code: unknown): code is string => typeof code === 'string' && IATA.test(code)

export const cacheKey = (q: FlightQuery) => `flights.quote.${q.origin}.${q.destination}.${q.dateFrom}.${q.dateTo}`

// Valida la risposta del server: scarta ogni voce che non ha prezzo, date e link validi
export const parseOffers = (raw: unknown): FlightOffer[] => {
  const list = Array.isArray((raw as any)?.offers) ? (raw as any).offers : []
  const offers: FlightOffer[] = []
  for (const item of list) {
    const price = Number(item?.price)
    if (!Number.isFinite(price) || price <= 0) continue
    if (typeof item?.departureAt !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(item.departureAt)) continue
    if (typeof item?.url !== 'string' || !/^https:\/\//.test(item.url)) continue
    offers.push({
      price: Math.round(price),
      currency: typeof item.currency === 'string' && item.currency ? item.currency.toUpperCase() : 'EUR',
      airline: typeof item.airline === 'string' && item.airline ? item.airline : undefined,
      departureAt: item.departureAt,
      returnAt: typeof item.returnAt === 'string' && item.returnAt ? item.returnAt : undefined,
      transfers: Number.isFinite(Number(item.transfers)) ? Number(item.transfers) : undefined,
      url: item.url,
    })
  }
  return offers.sort((a, b) => a.price - b.price)
}

export const parseSearchUrl = (raw: unknown): string | undefined => {
  const url = (raw as any)?.searchUrl
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : undefined
}

const day = (iso: string) => iso.slice(0, 10)

// La proposta principale è SOLO il volo per le date scelte (andata e ritorno esatti).
// In più, se esiste, una alternativa: l'offerta più economica in altre date (e più economica di quella scelta).
export const pickBest = (
  offers: FlightOffer[],
  query: Pick<FlightQuery, 'dateFrom' | 'dateTo'>
): { exact?: FlightOffer; alternative?: FlightOffer } | null => {
  if (offers.length === 0) return null
  const sorted = [...offers].sort((a, b) => a.price - b.price)
  const exact = sorted.find((o) => day(o.departureAt) === query.dateFrom && !!o.returnAt && day(o.returnAt) === query.dateTo)
  const alternative = sorted.find((o) => o !== exact && (!exact || o.price < exact.price))
  return { exact, alternative }
}

const isExpired = (fetchedAt: string, now: number, ttl: number) => now - new Date(fetchedAt).getTime() > ttl

interface Deps {
  fetchRemote: (q: FlightQuery) => Promise<unknown>
  storage: KeyValueStorage
  now?: () => number
  ttlMs?: number
}

const readCache = async (storage: KeyValueStorage, key: string): Promise<FlightQuote | null> => {
  try {
    const text = await storage.getItem(key)
    if (!text) return null
    const parsed = JSON.parse(text)
    const offers = parseOffers(parsed)
    if (offers.length === 0 || typeof parsed.fetchedAt !== 'string') return null
    const searchUrl = parseSearchUrl(parsed)
    return { offers, fetchedAt: parsed.fetchedAt, ...(searchUrl ? { searchUrl } : {}) }
  } catch {
    return null
  }
}

const withSearch = <T extends object>(base: T, searchUrl?: string) => (searchUrl ? { ...base, searchUrl } : base)

const toResult = (quote: FlightQuote, query: FlightQuery, stale: boolean): FlightResult => {
  const picked = pickBest(quote.offers, query)
  return picked && (picked.exact || picked.alternative)
    ? (withSearch({ status: 'ok' as const, quote, exact: picked.exact, alternative: picked.alternative, stale }, quote.searchUrl) as FlightResult)
    : (withSearch({ status: 'empty' as const }, quote.searchUrl) as FlightResult)
}

// Prezzi più bassi per un viaggio: usa la cache se fresca, altrimenti interroga il server;
// se il server non risponde mostra l'ultimo risultato noto (segnato come non aggiornato). Non lancia mai eccezioni.
export const cheapestFlightsWith = async (query: FlightQuery, deps: Deps): Promise<FlightResult> => {
  const now = deps.now ?? Date.now
  const ttl = deps.ttlMs ?? CACHE_TTL_MS
  const key = cacheKey(query)

  if (!isIata(query.origin) || !isIata(query.destination) || query.dateFrom > query.dateTo) {
    return { status: 'empty' }
  }

  const cached = await readCache(deps.storage, key)
  if (cached && !isExpired(cached.fetchedAt, now(), ttl)) return toResult(cached, query, false)

  try {
    const raw = await deps.fetchRemote(query)
    const offers = parseOffers(raw)
    const searchUrl = parseSearchUrl(raw)
    if (offers.length === 0) return withSearch({ status: 'empty' as const }, searchUrl) as FlightResult
    const quote: FlightQuote = { offers, fetchedAt: new Date(now()).toISOString(), ...(searchUrl ? { searchUrl } : {}) }
    try {
      await deps.storage.setItem(key, JSON.stringify(quote))
    } catch {
      // la cache è solo un'ottimizzazione
    }
    return toResult(quote, query, false)
  } catch (error) {
    // Offline o server in difficoltà: meglio un vecchio prezzo (dichiarato come tale) che niente
    if (cached) return toResult(cached, query, true)
    const reason: FlightFailure = error instanceof FlightError ? error.reason : 'unavailable'
    return { status: 'error', reason }
  }
}
