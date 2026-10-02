// Edge Function Supabase: propone tappe di viaggio con Gemini.
// Deploy: dashboard Supabase → Edge Functions → "suggest-steps" (oppure `supabase functions deploy suggest-steps`).
// Segreti (Edge Functions → Secrets): GEMINI_API_KEY (obbligatorio), GEMINI_MODELS (opzionale, elenco di modelli separati da virgola).
// La funzione richiede un utente autenticato (verify JWT attivo di default): la chiave Gemini non esce mai dal server.

// Modelli provati in ordine: se uno è sovraccarico (503), non esiste più (404) o ha finito la quota (429) passo al successivo.
const MODELS = (Deno.env.get('GEMINI_MODELS') ?? 'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.7-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)
const RETRYABLE_STATUSES = [404, 429, 500, 503]
const MAX_DAYS = 10
const MAX_STEPS_PER_DAY = 10 // limite di sicurezza sulla lunghezza della risposta, non un obiettivo
const MIN_RADIUS_KM = 5
const MAX_RADIUS_KM = 300

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) return json({ error: 'Servizio AI non configurato' }, 500)

  let input: any
  try {
    input = await req.json()
  } catch {
    return json({ error: 'Richiesta non valida' }, 400)
  }

  const city = String(input?.city ?? '').trim().slice(0, 80)
  const country = String(input?.country ?? '').trim().slice(0, 80)
  const styles: string[] = Array.isArray(input?.styles)
    ? input.styles.map((s: unknown) => String(s).slice(0, 40)).slice(0, 8)
    : []
  const days = clamp(Math.floor(Number(input?.days) || 1), 1, MAX_DAYS)
  const radiusKm = clamp(Math.floor(Number(input?.radiusKm) || 50), MIN_RADIUS_KM, MAX_RADIUS_KM)

  if (!city || !country) return json({ error: 'Città e paese sono obbligatori' }, 400)

  const prompt = [
    `Sei un esperto di viaggi. Proponi un itinerario per un viaggio a ${city}, ${country} di ${days} giorni.`,
    styles.length ? `Stile del viaggio: ${styles.join(', ')}.` : '',
    `Tutte le tappe devono trovarsi entro ${radiusKm} km dal centro di ${city}.`,
    radiusKm > 30
      ? 'Con un raggio ampio puoi includere gite giornaliere: le tappe dello stesso giorno devono comunque stare nella stessa zona ed essere raggiungibili in tempi realistici.'
      : '',
    `Adatta l'itinerario alla durata del viaggio (${days} ${days === 1 ? 'giorno' : 'giorni'}): con pochi giorni concentrati sui luoghi più importanti, con molti giorni aggiungi anche luoghi meno scontati e un ritmo più rilassato.`,
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
            lat: { type: 'NUMBER', description: 'Latitudine in gradi decimali' },
            lng: { type: 'NUMBER', description: 'Longitudine in gradi decimali' },
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

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    // Con molte tappe per più giorni la risposta è lunga: alzo il limite per non farla troncare
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.5, maxOutputTokens: 16000 },
  })

  let response: Response | null = null
  let lastError = ''
  for (const model of MODELS) {
    const attempt = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: requestBody,
    })
    if (attempt.ok) {
      response = attempt
      break
    }

    const errorText = await attempt.text()
    console.error('Gemini error', model, attempt.status, errorText)
    // Il messaggio di Gemini non contiene segreti: lo passo all'app per capire cosa non va (modello, chiave, ecc.)
    let detail = errorText.slice(0, 300)
    try {
      detail = JSON.parse(errorText)?.error?.message ?? detail
    } catch {
      // uso il testo grezzo
    }
    lastError = `${model} → ${attempt.status}: ${detail}`
    if (!RETRYABLE_STATUSES.includes(attempt.status)) break
  }

  if (!response) {
    return json({ error: 'Il servizio AI non ha risposto correttamente', detail: lastError }, 502)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    return json({ error: 'Risposta AI non valida' }, 502)
  }

  const suggestions = (Array.isArray(parsed?.suggestions) ? parsed.suggestions : [])
    .filter(
      (s: any) =>
        s &&
        typeof s.title === 'string' &&
        typeof s.placeName === 'string' &&
        Number.isFinite(Number(s.lat)) &&
        Number.isFinite(Number(s.lng)) &&
        Math.abs(Number(s.lat)) <= 90 &&
        Math.abs(Number(s.lng)) <= 180 &&
        !(Number(s.lat) === 0 && Number(s.lng) === 0)
    )
    .map((s: any) => ({
      day: clamp(Math.floor(Number(s.day) || 1), 1, days),
      type: s.type === 'food' ? 'food' : 'visit',
      title: s.title.slice(0, 100),
      placeName: s.placeName.slice(0, 120),
      address: String(s.address ?? '').slice(0, 160),
      lat: Number(s.lat),
      lng: Number(s.lng),
      startHour: clamp(Math.floor(Number(s.startHour) || 10), 7, 22),
      startMinute: clamp(Math.floor(Number(s.startMinute) || 0), 0, 59),
      durationMinutes: clamp(Math.floor(Number(s.durationMinutes) || 60), 20, 480),
      description: String(s.description ?? '').slice(0, 160),
    }))
    .slice(0, days * MAX_STEPS_PER_DAY)

  return json({ suggestions })
})
