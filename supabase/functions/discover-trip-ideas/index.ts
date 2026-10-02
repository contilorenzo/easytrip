// Edge Function Supabase: ogni giorno scopre 2 destinazioni nuove di 2 categorie a rotazione e le aggiunge a trip_ideas.
// Gemini propone le mete (adatte alla stagione e a un tema a rotazione), poi ognuna viene verificata su Wikivoyage:
// serve una pagina esistente con una sezione "Cosa vedere" ricca. Le righe nuove nascono senza dati: le riempie
// la funzione "refresh-trip-ideas" (foto, tappe, programma), che questa funzione avvia subito dopo.
// Deploy: dashboard → Edge Functions (o `supabase functions deploy discover-trip-ideas`).
// Segreti: GEMINI_API_KEY (lo stesso delle altre funzioni) e, opzionale, GEMINI_MODELS.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODELS = (Deno.env.get('GEMINI_MODELS') ?? 'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.7-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)
const RETRYABLE_STATUSES = [404, 429, 500, 503]
const CATEGORIES_PER_RUN = 2 // ogni giorno 2 categorie diverse, una destinazione nuova per ciascuna
const CANDIDATES_PER_CATEGORY = 5 // proposte chieste a Gemini per categoria: alcune verranno scartate dai controlli
const MAX_ACTIVE_PER_CATEGORY = 6 // oltre questo numero le più vecchie della categoria vengono archiviate (active = false)
const MIN_SEE_LISTINGS = 4 // attrazioni minime nella sezione "Cosa vedere" di Wikivoyage
const UA = 'EasyTrips/1.0 (lorenzo.conti.bg@gmail.com)'

// Categorie a rotazione: ogni giorno se ne usano 2 consecutive, quindi con 7 categorie il giro completo dura 7 giorni
const CATEGORIES: { id: string; description: string; minDays: number; maxDays: number }[] = [
  { id: 'weekend', description: 'weekend trip: mete comode da vedere in 2-3 giorni, facili da raggiungere dall’Italia', minDays: 2, maxDays: 3 },
  { id: 'citta', description: 'città d’arte, storia e cultura da visitare con calma', minDays: 3, maxDays: 5 },
  { id: 'avventura', description: 'avventura: esperienze attive, trekking, deserti, safari, mete insolite e lontane', minDays: 4, maxDays: 7 },
  { id: 'natura', description: 'natura: parchi, montagne, laghi, paesaggi spettacolari', minDays: 3, maxDays: 6 },
  { id: 'mare', description: 'mare: spiagge, isole e località costiere', minDays: 3, maxDays: 7 },
  { id: 'roadtrip', description: 'road trip in auto: un percorso a tappe attraverso una regione o un paese (es. Scozia, Puglia, Islanda), proposto come la REGIONE o il PAESE e non una singola città', minDays: 5, maxDays: 9 },
  { id: 'nightlife', description: 'nightlife: città note per vita notturna, locali, musica e divertimento', minDays: 2, maxDays: 4 },
]
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getJson = async (url: string, retries = 1): Promise<any> => {
  const response = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } })
  if (response.status === 429 && retries > 0) {
    await sleep(6000)
    return getJson(url, retries - 1)
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response.json()
}

const wikiApi = (params: Record<string, string>) =>
  getJson(`https://it.wikivoyage.org/w/api.php?${new URLSearchParams({ format: 'json', ...params })}`)

const norm = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

interface Candidate {
  category: string
  city: string
  wikiTitle: string
  countryCode: string
  days: number
  tagline: string
}

const askGemini = async (excluded: string[], categories: typeof CATEGORIES, day: Date): Promise<Candidate[]> => {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY mancante')

  const prompt = [
    'Sei un esperto di viaggi. Proponi destinazioni (città o località) da suggerire a viaggiatori italiani per un prossimo viaggio.',
    `Per ciascuna di queste categorie proponi ${CANDIDATES_PER_CATEGORY} destinazioni:`,
    ...categories.map((c) => `- "${c.id}": ${c.description} (durata consigliata ${c.minDays}-${c.maxDays} giorni)`),
    `Siamo a ${MONTHS[day.getUTCMonth()]}: preferisci mete adatte ai prossimi due mesi.`,
    'Scegli località che abbiano una pagina sulla guida Wikivoyage in italiano, con il titolo esatto della pagina (di solito il nome italiano della località; per i road trip il nome della regione o del paese).',
    'Varia continenti e paesi: non più di due destinazioni per lo stesso paese.',
    excluded.length ? `Non proporre queste destinazioni, che ci sono già: ${excluded.join(', ')}.` : '',
    'Per ognuna indica: la categoria (uno degli id sopra), la città (nome in italiano), il titolo della pagina Wikivoyage, il codice paese ISO 3166-1 alpha-2 in minuscolo (es. "pt"), la durata consigliata in giorni e una frase breve di presentazione (max 50 caratteri, in italiano).',
  ]
    .filter(Boolean)
    .join('\n')

  const schema = {
    type: 'OBJECT',
    properties: {
      ideas: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            category: { type: 'STRING', enum: categories.map((c) => c.id) },
            city: { type: 'STRING' },
            wikiTitle: { type: 'STRING', description: 'Titolo esatto della pagina su it.wikivoyage.org' },
            countryCode: { type: 'STRING', description: 'ISO alpha-2 minuscolo' },
            days: { type: 'INTEGER' },
            tagline: { type: 'STRING' },
          },
          required: ['category', 'city', 'wikiTitle', 'countryCode', 'days', 'tagline'],
        },
      },
    },
    required: ['ideas'],
  }

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.9, maxOutputTokens: 4000 },
  })

  for (const model of MODELS) {
    const attempt = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body,
    })
    if (attempt.ok) {
      const parsed = JSON.parse((await attempt.json())?.candidates?.[0]?.content?.parts?.[0]?.text)
      return Array.isArray(parsed?.ideas) ? parsed.ideas : []
    }
    console.error('Gemini error', model, attempt.status, (await attempt.text()).slice(0, 200))
    if (!RETRYABLE_STATUSES.includes(attempt.status)) break
  }
  throw new Error('Gemini non ha risposto')
}

// Verifica su Wikivoyage: pagina esistente e sezione "Cosa vedere" con abbastanza attrazioni
// (per i road trip basta una pagina regionale con "Territori e mete turistiche" o "Itinerari")
const checkWikivoyage = async (title: string, roadTrip = false): Promise<{ title: string } | null> => {
  let summary: any
  try {
    summary = await getJson(`https://it.wikivoyage.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
  } catch {
    return null
  }
  if (summary?.type !== 'standard') return null
  const canonical: string = summary.titles?.normalized ?? summary.title ?? title

  const sections: any[] = (await wikiApi({ action: 'parse', page: canonical, prop: 'sections' })).parse?.sections ?? []
  if (roadTrip) {
    const hasRegions = sections.some((s) => s.level === '2' && ['Territori e mete turistiche', 'Itinerari', 'Città'].includes(s.line))
    return hasRegions ? { title: canonical } : null
  }
  const see = sections.find((s) => s.level === '2' && s.line === 'Cosa vedere')?.index
  if (!see) return null
  const wikitext: string = (await wikiApi({ action: 'parse', page: canonical, prop: 'wikitext', section: see })).parse?.wikitext?.['*'] ?? ''
  const listings = (wikitext.match(/\{\{\s*(?:see|vedi)\s*\|/gi) ?? []).length
  return listings >= MIN_SEE_LISTINGS ? { title: canonical } : null
}

// Disponibile nell'ambiente delle Edge Functions: lascia finire un lavoro dopo aver risposto
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Destinazioni già presenti (anche archiviate): non si riproporranno
  const { data: existing, error } = await supabase.from('trip_ideas').select('wiki_title, city')
  if (error) return json({ error: error.message }, 500)
  const known = new Set<string>()
  for (const row of existing ?? []) {
    known.add(norm(row.wiki_title))
    known.add(norm(row.city))
  }

  // Codici e nomi (in italiano) dei paesi: servono anche a scartare codici inventati
  let countries: Record<string, string> = {}
  try {
    countries = await getJson('https://flagcdn.com/it/codes.json')
  } catch {
    return json({ error: 'Elenco paesi non raggiungibile' }, 502)
  }

  // Due categorie consecutive al giorno: (giorno*2) e (giorno*2+1) modulo 6
  const today = new Date()
  const dayNumber = Math.floor(today.getTime() / 86400000)
  let todays = Array.from({ length: CATEGORIES_PER_RUN }, (_, i) => CATEGORIES[(dayNumber * CATEGORIES_PER_RUN + i) % CATEGORIES.length])

  // Prove manuali: {"categories": ["roadtrip", "mare"]} sostituisce la rotazione del giorno
  let input: any = {}
  try {
    input = await req.json()
  } catch {}
  if (Array.isArray(input?.categories) && input.categories.length > 0) {
    const requested = CATEGORIES.filter((c) => input.categories.includes(c.id))
    if (requested.length === 0) {
      return json({ error: `Categorie non valide. Valide: ${CATEGORIES.map((c) => c.id).join(', ')}` }, 400)
    }
    todays = requested
  }

  let candidates: Candidate[]
  try {
    candidates = await askGemini((existing ?? []).map((row) => row.city), todays, today)
  } catch (e: any) {
    return json({ error: e?.message ?? 'Errore Gemini' }, 502)
  }

  const added: Record<string, string> = {} // categoria → città aggiunta
  const rejected: Record<string, string> = {}
  for (const candidate of candidates) {
    const category = todays.find((c) => c.id === candidate.category)
    if (!category || added[category.id]) continue // categoria non di oggi, oppure già coperta
    const code = String(candidate.countryCode ?? '').toLowerCase()
    const city = String(candidate.city ?? '').trim()
    const title = String(candidate.wikiTitle ?? '').trim()
    if (!city || !title) continue
    if (!countries[code]) {
      rejected[city] = 'codice paese non valido'
      continue
    }
    if (known.has(norm(city)) || known.has(norm(title))) {
      rejected[city] = 'già presente'
      continue
    }
    await sleep(800)
    const check = await checkWikivoyage(title, category.id === 'roadtrip')
    if (!check) {
      rejected[city] = 'pagina Wikivoyage assente o povera'
      continue
    }
    if (known.has(norm(check.title))) {
      rejected[city] = 'già presente'
      continue
    }

    const { error: insertError } = await supabase.from('trip_ideas').insert({
      wiki_title: check.title,
      city,
      country_id: code,
      country_name: countries[code],
      category: category.id,
      days: clamp(Math.floor(Number(candidate.days) || category.minDays), category.minDays, category.maxDays),
      sort_order: 0,
      active: true,
      fallback_tagline: String(candidate.tagline ?? '').slice(0, 80) || null,
    })
    if (insertError) {
      rejected[city] = `errore: ${insertError.message}`
      continue
    }
    known.add(norm(city))
    known.add(norm(check.title))
    added[category.id] = city
  }

  // Per ogni categoria tengo attive solo le più recenti: le altre restano in tabella ma non si vedono più
  const { data: active } = await supabase.from('trip_ideas').select('wiki_title, category').eq('active', true).order('created_at', { ascending: false })
  const perCategory: Record<string, number> = {}
  const overflow: string[] = []
  for (const row of active ?? []) {
    perCategory[row.category] = (perCategory[row.category] ?? 0) + 1
    if (perCategory[row.category] > MAX_ACTIVE_PER_CATEGORY) overflow.push(row.wiki_title)
  }
  if (overflow.length) await supabase.from('trip_ideas').update({ active: false }).in('wiki_title', overflow)

  // Avvio subito il riempimento (foto, tappe, programma): la funzione di refresh poi prosegue da sola
  // finché ci sono destinazioni nuove o scadute, quindi non serve una seconda pianificazione
  EdgeRuntime.waitUntil(
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/refresh-trip-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: '{}',
    }).catch((e) => console.error('Avvio del refresh non riuscito', e))
  )

  return json({ added, rejected, archived: overflow, refreshStarted: true })
})
