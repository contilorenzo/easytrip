import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FlightError,
  FlightQuery,
  KeyValueStorage,
  cacheKey,
  cheapestFlightsWith,
  parseOffers,
  pickBest,
} from './flightLogic'

const query: FlightQuery = { origin: 'MIL', destination: 'LIS', dateFrom: '2026-12-10', dateTo: '2026-12-14' }

const memoryStorage = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
  }
}

const rawOffers = {
  offers: [
    { price: 180, currency: 'eur', airline: 'TP', departureAt: '2026-12-10T08:00:00+01:00', returnAt: '2026-12-14T20:00:00+01:00', transfers: 0, url: 'https://www.aviasales.com/search/a?marker=m' },
    { price: 95.4, currency: 'EUR', departureAt: '2026-12-11', returnAt: '2026-12-15', url: 'https://www.aviasales.com/search/b?marker=m' },
    { price: 0, departureAt: '2026-12-10', url: 'https://x.test/free' },
    { price: 50, departureAt: 'domani', url: 'https://x.test/baddate' },
    { price: 60, departureAt: '2026-12-10', url: 'http://insecure.test/' },
    null,
  ],
}

test('parseOffers scarta le voci non valide e ordina per prezzo', () => {
  const offers = parseOffers(rawOffers)
  assert.deepEqual(offers.map((o) => o.price), [95, 180])
  assert.equal(offers[1].currency, 'EUR')
  assert.equal(offers[1].transfers, 0)
})

test('parseOffers regge risposte vuote o malformate', () => {
  assert.deepEqual(parseOffers(undefined), [])
  assert.deepEqual(parseOffers({ offers: 'boh' }), [])
  assert.deepEqual(parseOffers({}), [])
})

test('pickBest: la proposta principale è solo per le date esatte, più una alternativa più economica', () => {
  const picked = pickBest(parseOffers(rawOffers), query)!
  assert.equal(picked.exact?.price, 180)
  assert.equal(picked.alternative?.price, 95)
})

test('pickBest: senza date esatte non finge: nessun exact, solo l\'alternativa più economica', () => {
  const picked = pickBest(parseOffers(rawOffers), { dateFrom: '2026-12-20', dateTo: '2026-12-24' })!
  assert.equal(picked.exact, undefined)
  assert.equal(picked.alternative?.price, 95)
  assert.equal(pickBest([], query), null)
})

test('pickBest: se le date scelte sono già le più economiche non propone alternative', () => {
  const picked = pickBest(parseOffers(rawOffers), { dateFrom: '2026-12-11', dateTo: '2026-12-15' })!
  assert.equal(picked.exact?.price, 95)
  assert.equal(picked.alternative, undefined)
})

test('pickBest: un solo andata senza ritorno non conta come date esatte', () => {
  const picked = pickBest(parseOffers({ offers: [{ price: 50, departureAt: '2026-12-10', url: 'https://x.test/a' }] }), query)!
  assert.equal(picked.exact, undefined)
  assert.equal(picked.alternative?.price, 50)
})

test('prima richiesta: interroga il server e salva in cache', async () => {
  const storage = memoryStorage()
  let calls = 0
  const result = await cheapestFlightsWith(query, { storage, fetchRemote: async () => (calls++, rawOffers), now: () => 1000 })
  assert.equal(result.status, 'ok')
  assert.equal(calls, 1)
  assert.ok(storage.data.has(cacheKey(query)))
})

test('cache fresca: nessuna chiamata al server', async () => {
  const storage = memoryStorage()
  await cheapestFlightsWith(query, { storage, fetchRemote: async () => rawOffers, now: () => 0 })
  let calls = 0
  const result = await cheapestFlightsWith(query, { storage, fetchRemote: async () => (calls++, rawOffers), now: () => 60 * 60 * 1000 })
  assert.equal(calls, 0)
  assert.equal(result.status === 'ok' && result.stale, false)
})

test('cache scaduta con server offline: ultimo risultato noto segnato come non aggiornato', async () => {
  const storage = memoryStorage()
  await cheapestFlightsWith(query, { storage, fetchRemote: async () => rawOffers, now: () => 0 })
  const result = await cheapestFlightsWith(query, {
    storage,
    fetchRemote: async () => {
      throw new FlightError('offline')
    },
    now: () => 48 * 60 * 60 * 1000,
  })
  assert.equal(result.status, 'ok')
  assert.equal(result.status === 'ok' && result.stale, true)
})

test('errori senza cache: motivo corretto e nessuna eccezione', async () => {
  const storage = memoryStorage()
  const limited = await cheapestFlightsWith(query, {
    storage,
    fetchRemote: async () => {
      throw new FlightError('rate_limit')
    },
  })
  assert.deepEqual(limited, { status: 'error', reason: 'rate_limit' })

  const generic = await cheapestFlightsWith(query, {
    storage,
    fetchRemote: async () => {
      throw new Error('boom')
    },
  })
  assert.deepEqual(generic, { status: 'error', reason: 'unavailable' })
})

test('nessun risultato dal server: stato vuoto, e non viene messo in cache', async () => {
  const storage = memoryStorage()
  const result = await cheapestFlightsWith(query, { storage, fetchRemote: async () => ({ offers: [] }) })
  assert.deepEqual(result, { status: 'empty' })
  assert.equal(storage.data.size, 0)
})

test('input non valido (codici IATA o date) restituisce stato vuoto senza chiamare il server', async () => {
  let calls = 0
  const fetchRemote = async () => (calls++, rawOffers)
  const storage = memoryStorage()
  assert.equal((await cheapestFlightsWith({ ...query, origin: 'milano' }, { storage, fetchRemote })).status, 'empty')
  assert.equal((await cheapestFlightsWith({ ...query, dateFrom: '2026-12-20' }, { storage, fetchRemote })).status, 'empty')
  assert.equal(calls, 0)
})

test('una cache corrotta viene ignorata', async () => {
  const storage = memoryStorage()
  storage.data.set(cacheKey(query), '{non json')
  const result = await cheapestFlightsWith(query, { storage, fetchRemote: async () => rawOffers })
  assert.equal(result.status, 'ok')
})
