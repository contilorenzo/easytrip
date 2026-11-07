import test from 'node:test'
import assert from 'node:assert/strict'
const q = { city: 'Lisbona', country: 'PT', dateFrom: '2026-12-15', dateTo: '2026-12-19' }
import { parseTips, tipsWith, tipsCacheKey, TIPS_TTL_MS } from './tipsLogic'

const raw = {
  items: [
    { kind: 'esim', partner: 'Airalo', url: 'https://a.test/x', cityLevel: false },
    { kind: 'experiences', partner: 'Tiqets', url: 'https://t.test/x', cityLevel: true, dated: true },
    { kind: 'hotel', partner: 'X', url: 'https://x.test' },
    { kind: 'car', partner: 'Y', url: 'http://insecure.test' },
    { kind: 'experiences', partner: 'Dup', url: 'https://d.test' },
    null,
  ],
}

const mem = () => {
  const data = new Map<string, string>()
  return { data, getItem: async (k: string) => data.get(k) ?? null, setItem: async (k: string, v: string) => void data.set(k, v) }
}

test('parseTips scarta voci non valide, doppioni e ordina', () => {
  const tips = parseTips(raw)
  assert.deepEqual(tips.map((t) => t.kind), ['experiences', 'esim'])
  assert.equal(tips[0].cityLevel, true)
  assert.equal(tips[0].dated, true)
  assert.equal(tips[1].dated, false)
  assert.deepEqual(parseTips(undefined), [])
})

test('la cache dipende da città, paese e date', () => {
  assert.notEqual(tipsCacheKey(q), tipsCacheKey({ ...q, dateTo: '2026-12-20' }))
})

test('cache fresca: nessuna chiamata; scaduta con server giù: ultima copia', async () => {
  const storage = mem()
  let calls = 0
  await tipsWith(q, { storage, fetchRemote: async () => (calls++, raw), now: () => 0 })
  await tipsWith(q, { storage, fetchRemote: async () => (calls++, raw), now: () => 1000 })
  assert.equal(calls, 1)
  const old = await tipsWith(q, { storage, fetchRemote: async () => { throw new Error('x') }, now: () => TIPS_TTL_MS + 1 })
  assert.equal(old.length, 2)
})

test('errore senza cache: lista vuota, cache corrotta ignorata', async () => {
  const storage = mem()
  storage.data.set(tipsCacheKey({ ...q, city: 'Roma' }), '{boh')
  assert.deepEqual(await tipsWith({ ...q, city: 'Roma' }, { storage, fetchRemote: async () => { throw new Error('x') } }), [])
})
