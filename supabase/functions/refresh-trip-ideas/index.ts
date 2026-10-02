// Edge Function Supabase: aggiorna le idee di viaggio (tabella trip_ideas) leggendo Wikivoyage.
// Deploy: `supabase functions deploy refresh-trip-ideas` (lasciare attivo il verify JWT: la chiamata arriva da pg_cron con la service role key).
// Segreti (Edge Functions → Secrets): GEMINI_API_KEY (lo stesso di suggest-steps) e, opzionale, GEMINI_MODELS.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono forniti da Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STALE_DAYS = 7
const BATCH_SIZE = 2 // destinazioni per esecuzione (Wikivoyage + Nominatim + Gemini): si resta nei tempi della funzione. Con {"force":"all"} si rilancia più volte: ogni volta tocca le due più vecchie
const MAX_ATTRACTIONS = 10
const MAX_DISTANCE_KM = 40 // una tappa trovata più lontano dalla città si scarta
const MODELS = (Deno.env.get('GEMINI_MODELS') ?? 'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.7-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)
const RETRYABLE_STATUSES = [404, 429, 500, 503]
const MAX_STEPS_PER_DAY = 10
const MAX_CHAIN = 15 // richiami consecutivi al massimo (15 × 2 = 30 destinazioni per giro)
const UA = 'EasyTrips/1.0 (lorenzo.conti.bg@gmail.com)'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// GET con un nuovo tentativo se il sito risponde "troppe richieste"
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

// Wikimedia accetta solo larghezze standard per le miniature (500, 960...)
const toThumbnail = (url?: string, width = 960) => {
  if (!url) return null
  const clean = url.split('?')[0]
  const match = clean.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/)
  return match ? `${match[1]}/thumb/${match[2]}/${match[3]}/${width}px-${match[3]}` : clean
}

const decodeEntities = (text: string) =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const cutAtSentence = (text: string, max: number) => {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const end = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '))
  return end > max * 0.5 ? slice.slice(0, end + 1) : slice.replace(/\s+\S*$/, '') + '…'
}

// Paragrafi di una sezione: HTML → testo semplice
const paragraphsFromHtml = (html: string): string[] => {
  const withoutNoise = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<sup[\s\S]*?<\/sup>/g, '')
  const result: string[] = []
  for (const match of withoutNoise.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = decodeEntities(match[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
    if (text.length >= 60) result.push(text)
  }
  return result
}

// Pulizia del wikitesto di un campo (nome, descrizione)
const cleanWikitext = (value: string) =>
  value
    .replace(/<ref[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:.\-–]+/, '')
    .trim()

interface Attraction {
  name: string
  description?: string
  lat?: number
  lng?: number
}

// Estrae i template {{see|nome=...|descrizione=...}} dalla sezione "Cosa vedere"
const parseSeeListings = (wikitext: string): Attraction[] => {
  const found: Attraction[] = []
  const starts = [...wikitext.matchAll(/\{\{\s*(?:see|vedi)\s*\|/gi)]
  for (const start of starts) {
    let depth = 0
    let end = -1
    for (let i = start.index!; i < wikitext.length - 1; i++) {
      if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
        depth++
        i++
      } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
        depth--
        i++
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }
    if (end < 0) continue
    // Tolgo i link [[a|b]] prima di dividere sui "|" dei parametri
    const body = wikitext
      .slice(start.index! + start[0].length, end - 2)
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    const fields: Record<string, string> = {}
    for (const part of body.split(/\|(?=\s*[\wà-ù ]+\s*=)/)) {
      const eq = part.indexOf('=')
      if (eq > 0) fields[part.slice(0, eq).trim().toLowerCase()] = part.slice(eq + 1)
    }
    const name = capitalize(cleanWikitext(fields['nome'] ?? ''))
    if (!name || name.length > 80) continue
    const description = cleanWikitext(fields['descrizione'] ?? '')
    const lat = parseFloat(fields['lat'] ?? '')
    const lng = parseFloat(fields['long'] ?? '')
    found.push({
      name,
      description: description.length >= 15 ? capitalize(cutAtSentence(description, 220)) : undefined,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    })
  }
  const seen = new Set<string>()
  return found.filter((a) => {
    const key = a.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const rad = Math.PI / 180
  const h =
    Math.sin(((bLat - aLat) * rad) / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(((bLng - aLng) * rad) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

// Nominatim: 1 richiesta al secondo
const geocode = async (query: string): Promise<{ lat: number; lng: number } | null> => {
  await sleep(1100)
  try {
    const results = await getJson(
      `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: query, format: 'json', limit: '1' })}`
    )
    if (!results?.length) return null
    return { lat: Number(results[0].lat), lng: Number(results[0].lon) }
  } catch {
    return null
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

interface ItineraryStep {
  day: number
  type: 'visit' | 'food'
  title: string
  placeName: string
  address: string
  lat: number
  lng: number
  startHour: number
  startMinute: number
  durationMinutes: number
  description: string
}

// Gemini organizza il viaggio con le stesse regole dei suggerimenti dell'app (suggest-steps),
// includendo tutte le tappe già trovate su Wikivoyage
const buildItinerary = async (idea: any, attractions: Attraction[], regionStops: string[] = []): Promise<ItineraryStep[]> => {
  const isRoadTrip = idea.category === 'roadtrip'
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return []

  const days = clamp(Number(idea.days) || 3, 1, 10)
  const known = attractions.map((a) => {
    const position = a.lat !== undefined && a.lng !== undefined ? ` — lat ${a.lat}, lng ${a.lng}` : ''
    return `- ${a.name}${position}${a.description ? ` (${a.description.slice(0, 100)})` : ''}`
  })

  const intro = isRoadTrip
    ? [
        `Sei un esperto di viaggi. Proponi un ROAD TRIP in auto di ${days} giorni in questa zona: ${idea.city}, ${idea.country_name}.`,
        'È un percorso a tappe, non un soggiorno in un solo luogo: ogni giorno o ogni due giorni ci si sposta verso una nuova base, in un percorso sensato (preferibilmente un anello o un tragitto lineare senza ritorni inutili).',
        'I trasferimenti in auto tra una zona e l’altra non superano le 3 ore al giorno; le tappe dello stesso giorno stanno nella stessa zona. Nel campo description di ogni prima tappa del giorno indica anche il tragitto (es. "Da Edimburgo a Pitlochry, circa 1h30 di guida").',
        'La durata (durationMinutes) di una tappa che richiede uno spostamento include il tempo di guida per raggiungerla.',
        'Il viaggio inizia e finisce in aeroporto, e questo è importante: scegli l’aeroporto internazionale più comodo per iniziare il percorso (e, se il percorso non è un anello, anche quello di ritorno, che può essere diverso).',
        'La PRIMA tappa del giorno 1 è l’arrivo all’aeroporto (type "visit", title "Arrivo: Aeroporto di <nome>", placeName con il nome ufficiale dell’aeroporto e le sue coordinate, durata 60-90 minuti per ritiro bagagli e auto a noleggio), a un orario realistico di mattina o primo pomeriggio. L’ULTIMA tappa dell’ultimo giorno è la partenza dall’aeroporto di ritorno (title "Partenza: Aeroporto di <nome>", durata circa 120 minuti per riconsegna auto e check-in) e finisce entro le 23:00. Queste due tappe fanno eccezione alla regola sull’inizio della giornata alle 9:00 del giorno 1 e sulla fine in serata dell’ultimo giorno, ma restano in ordine cronologico senza sovrapposizioni. Il giorno di arrivo e quello di partenza hanno meno attività perché una parte della giornata è dedicata al volo.',
        regionStops.length ? `Località della zona tra cui puoi scegliere le basi (suggerimento, non obbligatorie): ${regionStops.join(', ')}.` : '',
      ]
    : [
        `Sei un esperto di viaggi. Proponi un itinerario per un viaggio a ${idea.city}, ${idea.country_name} di ${days} giorni.`,
        'Tutte le tappe devono trovarsi entro 30 km dal centro della città, e quelle dello stesso giorno nella stessa zona, raggiungibili in tempi realistici.',
      ]
  const prompt = [
    ...intro,
    `Adatta l'itinerario alla durata (${days} giorni): con pochi giorni concentrati sui luoghi più importanti, con molti giorni aggiungi anche luoghi meno scontati e un ritmo più rilassato.`,
    known.length
      ? `Queste tappe sono già state selezionate e vanno incluse TUTTE nell'itinerario (usa il loro nome e, quando indicate, esattamente le loro coordinate). Raggruppale per giorno in base alla vicinanza e aggiungi altre tappe e i pasti dove servono:\n${known.join('\n')}`
      : '',
    'Le attività di ogni giorno devono riempire tutta la giornata, dalla mattina alla sera: la prima inizia verso le 9:00 (non prima delle 8:00) e l’ultima finisce in serata (entro le 23:00), senza lunghi buchi tra un’attività e l’altra.',
    'Il numero di attività dipende dalla loro durata: se sono lunghe ne bastano poche (una gita o un grande museo possono occupare mezza giornata), se sono brevi ne servono di più. Non accorciare né allungare artificialmente le durate per far tornare i conti.',
    'La durata di ogni attività (durationMinutes) è realistica per quel tipo di luogo e include già il tempo per raggiungerlo dall’attività precedente.',
    'Le attività di un giorno sono in ordine cronologico e non si sovrappongono MAI: ogni attività inizia solo dopo la fine della precedente.',
    'Ogni giorno include esattamente un pranzo e una cena, di tipo "food" (un locale o una zona nota per mangiare); tutte le altre attività sono di tipo "visit".',
    'Orari dei pasti sensati: il pranzo inizia tra le 12:30 e le 14:00 e la cena tra le 19:30 e le 21:00. Non mettere mai un pasto fuori da queste fasce.',
    'Usa solo luoghi reali e molto noti, con il loro nome ufficiale.',
    'Per ogni tappa indica le coordinate geografiche in gradi decimali (lat, lng) con almeno 5 decimali, il più precise possibile, e un indirizzo breve (via e città).',
    'Scrivi titolo e descrizione in italiano; la descrizione è una frase breve (max 120 caratteri).',
  ]
    .filter(Boolean)
    .join('\n')

  const schema = {
    type: 'OBJECT',
    properties: {
      suggestions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            day: { type: 'INTEGER', description: 'Numero del giorno, da 1' },
            type: { type: 'STRING', enum: ['visit', 'food'] },
            title: { type: 'STRING' },
            placeName: { type: 'STRING', description: 'Nome ufficiale del luogo' },
            address: { type: 'STRING', description: 'Indirizzo breve del luogo' },
            lat: { type: 'NUMBER' },
            lng: { type: 'NUMBER' },
            startHour: { type: 'INTEGER', description: 'Ora di inizio, 7-22' },
            startMinute: { type: 'INTEGER', description: '0, 15, 30 o 45' },
            durationMinutes: { type: 'INTEGER', description: 'Durata realistica in minuti, spostamento incluso' },
            description: { type: 'STRING' },
          },
          required: ['day', 'type', 'title', 'placeName', 'address', 'lat', 'lng', 'startHour', 'startMinute', 'durationMinutes', 'description'],
        },
      },
    },
    required: ['suggestions'],
  }

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4, maxOutputTokens: 16000 },
  })

  let response: Response | null = null
  for (const model of MODELS) {
    const attempt = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body,
    })
    if (attempt.ok) {
      response = attempt
      break
    }
    console.error('Gemini error', model, attempt.status, (await attempt.text()).slice(0, 200))
    if (!RETRYABLE_STATUSES.includes(attempt.status)) break
  }
  if (!response) return []

  let parsed: any
  try {
    parsed = JSON.parse((await response.json())?.candidates?.[0]?.content?.parts?.[0]?.text)
  } catch {
    return []
  }

  const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9à-ù]+/g, ' ').trim()
  const steps: ItineraryStep[] = (Array.isArray(parsed?.suggestions) ? parsed.suggestions : [])
    .filter(
      (s: any) =>
        s &&
        typeof s.title === 'string' &&
        typeof s.placeName === 'string' &&
        Number.isFinite(Number(s.lat)) &&
        Number.isFinite(Number(s.lng)) &&
        !(Number(s.lat) === 0 && Number(s.lng) === 0)
    )
    .map((s: any) => {
      // Se è una tappa di Wikivoyage con coordinate, tengo quelle originali (più affidabili di quelle dell'AI)
      const key = norm(s.placeName)
      const original = attractions.find(
        (a) => a.lat !== undefined && (norm(a.name) === key || norm(a.name).includes(key) || key.includes(norm(a.name)))
      )
      return {
        day: clamp(Math.floor(Number(s.day) || 1), 1, days),
        type: s.type === 'food' ? 'food' : 'visit',
        title: s.title.slice(0, 100),
        placeName: s.placeName.slice(0, 120),
        address: String(s.address ?? '').slice(0, 160),
        lat: original?.lat ?? Number(s.lat),
        lng: original?.lng ?? Number(s.lng),
        startHour: clamp(Math.floor(Number(s.startHour) || 10), 7, 22),
        startMinute: clamp(Math.floor(Number(s.startMinute) || 0), 0, 59),
        durationMinutes: clamp(Math.floor(Number(s.durationMinutes) || 60), 20, 480),
        description: String(s.description ?? '').slice(0, 160),
      } as ItineraryStep
    })
    .slice(0, days * MAX_STEPS_PER_DAY)

  // Elimino le sovrapposizioni: ogni attività inizia solo dopo la fine della precedente dello stesso giorno
  steps.sort((a, b) => a.day - b.day || a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute))
  let day = 0
  let freeAt = 0
  for (const step of steps) {
    if (step.day !== day) {
      day = step.day
      freeAt = 0
    }
    const start = Math.max(step.startHour * 60 + step.startMinute, freeAt)
    step.startHour = Math.floor(start / 60)
    step.startMinute = start % 60
    freeAt = start + step.durationMinutes
  }
  return steps
}

// Località elencate nella sezione "Territori e mete turistiche" di una pagina regionale (link interni del wikitesto)
const loadRegionStops = async (title: string, sections: any[]): Promise<string[]> => {
  const index = sections.find((s) => s.level === '2' && ['Territori e mete turistiche', 'Città', 'Altre destinazioni'].includes(s.line))?.index
  if (!index) return []
  try {
    const wikitext: string = (await wikiApi({ action: 'parse', page: title, prop: 'wikitext', section: index })).parse?.wikitext?.['*'] ?? ''
    const names: string[] = []
    for (const match of wikitext.matchAll(/\[\[([^\]|#:]+)(?:\|[^\]]*)?\]\]/g)) {
      const name = match[1].trim()
      if (name && !names.includes(name)) names.push(name)
    }
    return names.slice(0, 14)
  } catch {
    return []
  }
}

const refreshIdea = async (idea: any) => {
  const title = encodeURIComponent(idea.wiki_title)

  // Descrizione breve e foto
  const summary = await getJson(`https://it.wikivoyage.org/api/rest_v1/page/summary/${title}`)
  const description: string | undefined = summary.description
  const tagline = description ? description.charAt(0).toUpperCase() + description.slice(1) : null
  const image = toThumbnail(summary.originalimage?.source ?? summary.thumbnail?.source)

  // Sezioni della pagina
  const sections: any[] = (await wikiApi({ action: 'parse', page: idea.wiki_title, prop: 'sections' })).parse?.sections ?? []
  const sectionIndex = (...names: string[]) => sections.find((s) => s.level === '2' && names.includes(s.line))?.index

  // Testo introduttivo: "Da sapere", altrimenti il riassunto
  let intro: string | null = null
  const knowIndex = sectionIndex('Da sapere')
  if (knowIndex) {
    const html = (await wikiApi({ action: 'parse', page: idea.wiki_title, prop: 'text', section: knowIndex })).parse?.text?.['*'] ?? ''
    // Riassunto della pagina + primo paragrafo di "Da sapere"
    const paragraphs = [String(summary.extract ?? ''), ...paragraphsFromHtml(html).slice(0, 1)].filter((p) => p.length >= 30)
    if (paragraphs.length) intro = cutAtSentence(paragraphs.join('\n\n'), 700)
  }
  if (!intro && summary.extract) intro = cutAtSentence(String(summary.extract), 700)

  // Tappe proposte: i luoghi della sezione "Cosa vedere"
  let attractions: Attraction[] = []
  const seeIndex = sectionIndex('Cosa vedere')
  if (seeIndex) {
    const wikitext = (await wikiApi({ action: 'parse', page: idea.wiki_title, prop: 'wikitext', section: seeIndex })).parse?.wikitext?.['*'] ?? ''
    attractions = parseSeeListings(wikitext).slice(0, MAX_ATTRACTIONS)
  }

  // Coordinate mancanti: le cerco una volta sola, scartando i risultati lontani dalla città
  const center = idea.category !== 'roadtrip' && attractions.some((a) => a.lat === undefined) ? await geocode(`${idea.city}, ${idea.country_name}`) : null
  if (center) {
    for (const attraction of attractions) {
      if (attraction.lat !== undefined) continue
      const point = await geocode(`${attraction.name}, ${idea.city}, ${idea.country_name}`)
      if (point && distanceKm(center.lat, center.lng, point.lat, point.lng) <= MAX_DISTANCE_KM) {
        attraction.lat = point.lat
        attraction.lng = point.lng
      }
    }
  }

  // Programma giorno per giorno con Gemini (se fallisce resta l'elenco delle tappe)
  let itinerary: ItineraryStep[] = []
  try {
    itinerary = await buildItinerary(idea, attractions, idea.category === 'roadtrip' ? await loadRegionStops(idea.wiki_title, sections) : [])
  } catch (e) {
    console.error('Itinerario non generato', idea.wiki_title, e)
  }

  return { tagline, image_url: image, intro, attractions, itinerary, refreshed_at: new Date().toISOString() }
}

// Disponibile nell'ambiente delle Edge Functions: lascia finire un lavoro dopo aver risposto
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let input: any = {}
  try {
    input = await req.json()
  } catch {}
  const force: string | undefined = typeof input?.force === 'string' ? input.force : undefined
  const chain = Number(input?.chain) || 0

  let query = supabase.from('trip_ideas').select('*').eq('active', true)
  if (force && force !== 'all') {
    query = query.eq('wiki_title', force)
  } else if (!force) {
    const threshold = new Date(Date.now() - STALE_DAYS * 86400000).toISOString()
    query = query.or(`refreshed_at.is.null,refreshed_at.lt.${threshold}`)
  }
  const { data: ideas, error } = await query.order('refreshed_at', { ascending: true, nullsFirst: true }).limit(BATCH_SIZE)
  if (error) return json({ error: error.message }, 500)

  const report: Record<string, string> = {}
  for (const idea of ideas ?? []) {
    try {
      const update = await refreshIdea(idea)
      const { error: updateError } = await supabase.from('trip_ideas').update(update).eq('wiki_title', idea.wiki_title)
      report[idea.wiki_title] = updateError ? `errore: ${updateError.message}` : `ok (${update.attractions.length} tappe da Wikivoyage, ${update.itinerary.length} nel programma)`
    } catch (e: any) {
      // Una destinazione che fallisce non blocca le altre: resta il vecchio contenuto
      report[idea.wiki_title] = `errore: ${e?.message ?? e}`
      // Riprova tra un giorno invece di restare sempre in testa alla coda e bloccare le altre
      await supabase
        .from('trip_ideas')
        .update({ refreshed_at: new Date(Date.now() - (STALE_DAYS - 1) * 86400000).toISOString() })
        .eq('wiki_title', idea.wiki_title)
    }
    await sleep(1500)
  }

  // Se restano destinazioni da aggiornare (nuove o scadute) la funzione si richiama da sola:
  // basta un solo avvio al giorno (quello di discover-trip-ideas) per rinnovare tutto
  let remaining = 0
  if (!force && chain < MAX_CHAIN) {
    const threshold = new Date(Date.now() - STALE_DAYS * 86400000).toISOString()
    const { count } = await supabase
      .from('trip_ideas')
      .select('wiki_title', { count: 'exact', head: true })
      .eq('active', true)
      .or(`refreshed_at.is.null,refreshed_at.lt.${threshold}`)
    remaining = count ?? 0
    if (remaining > 0) {
      EdgeRuntime.waitUntil(
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/refresh-trip-ideas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({ chain: chain + 1 }),
        }).catch((e) => console.error('Richiamo non riuscito', e))
      )
    }
  }
  return json({ refreshed: report, remaining })
})
