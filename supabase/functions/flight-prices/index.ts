// Edge Function Supabase: prezzi indicativi dei voli (Travelpayouts / Aviasales Data API) con link di affiliazione.
// Il token e il marker restano qui sul server: l'app non li vede mai.
// Deploy: dashboard Supabase → Edge Functions → "flight-prices" (oppure `supabase functions deploy flight-prices`).
// Segreti (Edge Functions → Secrets), tutti obbligatori per i prezzi:
//  - TRAVELPAYOUTS_TOKEN: token API (Profilo → API token)
//  - TRAVELPAYOUTS_MARKER: il tuo ID partner
//  - TRAVELPAYOUTS_TRS: ID del progetto iscritto al programma Aviasales
// Opzionale: TRAVELPAYOUTS_MARKET (mercato dei dati; se manca lo sceglie Travelpayouts in base alla partenza).
//
// Azioni (POST, JSON):
//  - { action: 'places', term }  → cerca città/aeroporti e restituisce i codici IATA (autocomplete pubblico, senza token)
//  - { action: 'prices', origin, destination, dateFrom, dateTo } → offerte più economiche in cache, con link di affiliazione
// I prezzi arrivano da una cache (dati trovati dagli utenti di Aviasales nei giorni scorsi): sono indicativi.

const PRICES_URL = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates'
const PLACES_URL = 'https://autocomplete.travelpayouts.com/places2'
// Versione per il mercato italiano (prezzi in euro). Aviasales non ha l'interfaccia in italiano: la lingua più vicina è l'inglese
const SITE = 'https://www.aviasales.com/it-en'
const CURRENCY = 'eur'
const TIMEOUT_MS = 10000
const IATA = /^[A-Z]{3}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const fetchWithTimeout = async (url: string, init: RequestInit = {}) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const LINKS_URL = 'https://api.travelpayouts.com/links/v1/create'
const MAX_LINKS = 10 // limite dell'API dei link per richiesta

// Trasforma i link Aviasales in link partner (documentazione "API for Travelpayouts partner links").
// Le offerte il cui link non si riesce a convertire vengono scartate: non mostriamo mai link senza affiliazione.
const toPartnerLinks = async (urls: string[], token: string, marker: string, trs: string): Promise<(string | null)[]> => {
  const res = await fetchWithTimeout(LINKS_URL, {
    method: 'POST',
    headers: { 'X-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trs: Number(trs),
      marker: Number(marker),
      shorten: false,
      links: urls.map((url) => ({ url, sub_id: 'easytrips-flights' })),
    }),
  })
  if (res.status === 429) throw new Error('rate_limit')
  if (!res.ok) throw new Error('links_failed')
  const data = await res.json()
  const links: any[] = Array.isArray(data?.result?.links) ? data.result.links : []
  return urls.map((url) => {
    const found = links.find((l) => l?.url === url)
    return found?.code === 'success' && typeof found?.partner_url === 'string' && found.partner_url.startsWith('https://')
      ? found.partner_url
      : null
  })
}

// Città servite da Welcome Pickups (dal loro sito, novembre 2026): il sito blocca le verifiche automatiche, quindi l'elenco è fisso
const WELCOME_PICKUPS_CITIES = new Set(
  'abu-dhabi addis-ababa adelaide agadir alexandria algiers alicante almaty almeria amman amsterdam ankara antalya antigua aruba arusha astana asuncion athens atlanta auckland austin bahrain baku bali baltimore bangalore bangkok barbados barcelona bari barranquilla basel bastia beijing beirut belfast belgrade belize bergen berlin biarritz bilbao billund birmingham bodrum bogota bologna boracay bordeaux boston bratislava brindisi brisbane bristol brno brussels bucharest budapest buenos-aires buffalo burgas busan cabo-san-lucas cagliari cairns cairo calgary cali cancun cape-town cappadocia cardiff cartagena casablanca catania cebu chennai chiang-mai chicago chisinau christchurch cochin cologne colombo copenhagen corfu crete curacao cusco da-nang dalaman dallas dammam dar-es-salaam davao delhi denver detroit dhaka djerba doha dubai dublin dubrovnik durban dusseldorf edinburgh eindhoven faro fes figari florence florianopolis fortaleza frankfurt gdansk geneva genoa girona glasgow goa gold-coast gothenburg gran-canaria granada graz guadalajara guadeloupe guangzhou guatemala hamburg hamilton hammamet hannover hanoi helsinki ho-chi-minh hong-kong honolulu houston huatulco hurghada hyderabad ibiza innsbruck istanbul izmir jaipur jakarta jeddah jerez johannesburg johor-bahru kalamata kathmandu katowice kavala kefalonia kingston koh-samui kos kota-kinabalu krabi krakow kuala-lumpur kutaisi kuwait la-paz lagos lahore langkawi lanzarote las-vegas leeds lesvos lille lima lisbon liverpool ljubljana lombok london los-angeles luxembourg luxor lyon madeira madinah madrid mahe malaga mallorca malta managua manchester manila marrakech marsa-alam marseille martinique mauritius mazatlan medan medellin melbourne mendoza merida mexico-city miami milan minneapolis monastir montego-bay monterrey montevideo montpellier montreal mumbai munich murcia muscat mykonos mytilene nadi nairobi nantes naples nashville nassau naxos new-orleans new-york newcastle nha-trang nice oaxaca olbia orlando osaka oslo ottawa oviedo palermo panama paris paros penang pereira perth philadelphia phnom-penh phoenix phu-quoc phuket pisa podgorica ponta-delgada port-of-spain portland porto porto-alegre poznan prague puerto-escondido puerto-princesa puerto-vallarta pula punta-cana quebec queenstown quito rabat recife rennes reykjavik rhodes riga rimini rio-de-janeiro riyadh rome rotterdam rovaniemi saint-lucia salalah salvador salzburg samos san-antonio san-diego san-francisco san-jose san-juan san-salvador san-sebastian santa-marta santiago santiago-de-compostela santo-domingo santorini sao-paulo sapporo sarajevo savannah seattle seoul seville shanghai sharjah sharm-el-sheikh siem-reap singapore skiathos skopje sofia southampton split stavanger stockholm strasbourg stuttgart surabaya sydney tahiti taipei tallinn tampa tangier tarragona tashkent tbilisi tel-aviv tenerife thessaloniki tijuana tirana tivat tokyo toronto toulouse trabzon tromso tunis turin valencia vancouver varna venice verona vienna vientiane vigo vilnius warsaw washington wellington wroclaw yerevan yogyakarta zadar zagreb zakynthos zanzibar zaragoza zurich'.split(' ')
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405)

  let input: any
  try {
    input = await req.json()
  } catch {
    return json({ error: 'Richiesta non valida' }, 400)
  }

  if (input?.action === 'places') {
    const term = String(input?.term ?? '').trim().slice(0, 60)
    if (term.length < 2) return json({ places: [] })
    try {
      const params = new URLSearchParams({ term, locale: 'it' })
      params.append('types[]', 'city')
      params.append('types[]', 'airport')
      const res = await fetchWithTimeout(`${PLACES_URL}?${params.toString()}`)
      if (!res.ok) return json({ error: 'Servizio non disponibile' }, 502)
      const data = await res.json()
      const places = (Array.isArray(data) ? data : []).slice(0, 12).map((p: any) => ({
        code: String(p.code ?? ''),
        type: p.type === 'airport' ? 'airport' : 'city',
        name: String(p.name ?? ''),
        cityName: String(p.city_name ?? p.name ?? ''),
        countryCode: String(p.country_code ?? '').toLowerCase(),
        countryName: String(p.country_name ?? ''),
      }))
      return json({ places: places.filter((p: any) => IATA.test(p.code)) })
    } catch {
      return json({ error: 'Servizio non raggiungibile' }, 502)
    }
  }

  if (input?.action !== 'prices' && input?.action !== 'tips') return json({ error: 'Azione non valida' }, 400)

  const token = Deno.env.get('TRAVELPAYOUTS_TOKEN')
  const marker = Deno.env.get('TRAVELPAYOUTS_MARKER')
  const trs = Deno.env.get('TRAVELPAYOUTS_TRS')
  if (!token || !marker || !trs) return json({ error: 'Servizio voli non configurato' }, 503)

  // Consigli di viaggio: link di affiliazione ai partner (esperienze, bagagli, auto, transfer, eSIM).
  // Ogni link usa città (e date, dove il partner le accetta) del viaggio; i partner che non coprono la città vengono omessi.
  if (input?.action === 'tips') {
    const cityInput = String(input?.city ?? '').trim().slice(0, 60)
    const country = String(input?.country ?? '').toUpperCase()
    const dateFrom = String(input?.dateFrom ?? '')
    const dateTo = String(input?.dateTo ?? '')
    if (cityInput.length < 2 || !DATE.test(dateFrom) || !DATE.test(dateTo) || dateFrom > dateTo) {
      return json({ error: 'Parametri non validi' }, 400)
    }

    // Nome della città (e del paese) nella lingua richiesta, dal servizio di autocompletamento
    const lookup = async (locale: string) => {
      try {
        const params = new URLSearchParams({ term: cityInput, locale })
        params.append('types[]', 'city')
        const res = await fetchWithTimeout(`${PLACES_URL}?${params.toString()}`)
        if (!res.ok) return null
        const data = await res.json()
        const list: any[] = Array.isArray(data) ? data : []
        const hit = list.find((p) => String(p.country_code ?? '').toUpperCase() === country) ?? (country ? null : list[0])
        return hit ? { city: String(hit.name ?? ''), country: String(hit.country_name ?? '') } : null
      } catch {
        return null
      }
    }
    const en = await lookup('en')
    const cityEn = en?.city || cityInput
    const countryEn = en?.country || ''

    const slug = (v: string) =>
      v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const exists = async (url: string) => {
      try {
        const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EasyTrips)' } })
        return res.status === 200
      } catch {
        return false
      }
    }
    const citySlug = slug(cityEn)
    const q = encodeURIComponent(cityEn)

    type Candidate = { kind: string; partner: string; url: string; cityLevel: boolean; dated: boolean }
    const candidates: Candidate[] = []

    // Esperienze: pagina della città (Tiqets); le date si scelgono sulla singola esperienza
    candidates.push({ kind: 'experiences', partner: 'Tiqets', url: `https://www.tiqets.com/en/search?q=${q}`, cityLevel: true, dated: false })

    // Bagagli: Radical Storage con città e giorno di partenza (se non copre la città, la riga non compare)
    if (citySlug && countryEn) {
      const label = encodeURIComponent(`${cityEn}, ${countryEn}`)
      const luggageUrl = `https://radicalstorage.com/storage-list/${citySlug}?s=${label}&bags=1&dropOff=${dateTo}T10:00:00Z&pickUp=${dateTo}T18:00:00Z`
      if (await exists(`https://radicalstorage.com/storage-list/${citySlug}?s=${label}`)) {
        candidates.push({ kind: 'luggage', partner: 'Radical Storage', url: luggageUrl, cityLevel: true, dated: true })
      }
    }

    // Auto: Localrent con la pagina della città e le date del viaggio (risultati subito, senza lasciare contatti) se la copre;
    // altrimenti EconomyBookings, un comparatore (la città si sceglie sul sito, non abbiamo il suo codice interno)
    const countrySlug = slug(countryEn)
    if (citySlug && countrySlug && (await exists(`https://www.localrent.com/en/${countrySlug}/${citySlug}/`))) {
      candidates.push({
        kind: 'car',
        partner: 'Localrent',
        url: `https://www.localrent.com/en/${countrySlug}/${citySlug}/?pickup_date=${dateFrom}&dropoff_date=${dateTo}`,
        cityLevel: true,
        dated: true,
      })
    } else {
      candidates.push({ kind: 'car', partner: 'EconomyBookings', url: 'https://www.economybookings.com/it', cityLevel: false, dated: false })
    }

    // Transfer: pagina della città su Welcome Pickups, solo per le città che servono (elenco dal loro sito)
    if (WELCOME_PICKUPS_CITIES.has(citySlug)) {
      candidates.push({ kind: 'transfer', partner: 'Welcome Pickups', url: `https://www.welcomepickups.com/${citySlug}/`, cityLevel: true, dated: false })
    }

    // eSIM: pagina del paese su Airalo (non serve per i viaggi in Italia)
    if (countrySlug && country !== 'IT' && (await exists(`https://www.airalo.com/${countrySlug}-esim`))) {
      candidates.push({ kind: 'esim', partner: 'Airalo', url: `https://www.airalo.com/${countrySlug}-esim`, cityLevel: false, dated: false })
    }

    let converted: (string | null)[]
    try {
      converted = await toPartnerLinks(candidates.map((c) => c.url), token, marker, trs)
    } catch (error) {
      const limited = (error as Error).message === 'rate_limit'
      return json({ error: limited ? 'Troppe richieste' : 'Link non disponibili' }, limited ? 429 : 502)
    }
    const items = candidates.map((c, i) => ({ ...c, url: converted[i] })).filter((c) => !!c.url)
    if (items.length === 0) return json({ error: 'Servizio non configurato' }, 503)
    return json({ items, fetchedAt: new Date().toISOString() })
  }

  const origin = String(input?.origin ?? '').toUpperCase()
  const destination = String(input?.destination ?? '').toUpperCase()
  const dateFrom = String(input?.dateFrom ?? '')
  const dateTo = String(input?.dateTo ?? '')
  if (!IATA.test(origin) || !IATA.test(destination) || !DATE.test(dateFrom) || !DATE.test(dateTo) || dateFrom > dateTo) {
    return json({ error: 'Parametri non validi' }, 400)
  }

  // Due richieste in parallelo:
  //  1) le date esatte scelte dall'utente (per la proposta principale);
  //  2) il mese di partenza e di ritorno, per le alternative più economiche.
  const baseParams = (departure: string, ret: string, limit: number) => {
    const params = new URLSearchParams({
      origin,
      destination,
      departure_at: departure,
      return_at: ret,
      currency: CURRENCY,
      sorting: 'price',
      one_way: 'false',
      unique: 'false',
      limit: String(limit),
    })
    const market = Deno.env.get('TRAVELPAYOUTS_MARKET')
    if (market) params.set('market', market)
    return params
  }

  const query = async (params: URLSearchParams): Promise<any[]> => {
    const res = await fetchWithTimeout(`${PRICES_URL}?${params.toString()}`, {
      headers: { 'X-Access-Token': token, 'Accept-Encoding': 'gzip' },
    })
    if (res.status === 429) throw new Error('rate_limit')
    if (!res.ok) throw new Error('unavailable')
    const data = await res.json()
    return Array.isArray(data?.data) ? data.data : []
  }

  let exactRows: any[]
  let monthRows: any[]
  try {
    ;[exactRows, monthRows] = await Promise.all([
      query(baseParams(dateFrom, dateTo, 5)),
      query(baseParams(dateFrom.slice(0, 7), dateTo.slice(0, 7), 50)),
    ])
  } catch (error) {
    const rateLimited = (error as Error).message === 'rate_limit'
    return json({ error: rateLimited ? 'Troppe richieste' : 'Servizio prezzi non disponibile' }, rateLimited ? 429 : 502)
  }

  // Prima le offerte per le date esatte, poi le più economiche del periodo (senza doppioni)
  const valid = (o: any) => Number(o?.price) > 0 && typeof o?.departure_at === 'string' && typeof o?.link === 'string'
  const seen = new Set<string>()
  const raw = [...exactRows.filter(valid).slice(0, 3), ...monthRows.filter(valid)]
    .filter((o: any) => {
      const key = `${o.departure_at}|${o.return_at}|${o.price}|${o.airline}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    // l'API dei link accetta al massimo 10 link per richiesta: uno è riservato alla ricerca per le date esatte
    .slice(0, MAX_LINKS - 1)

  // Link di ricerca in tempo reale per le date scelte (senza prezzo): serve quando non c'è un'offerta per quelle date
  const ddmm = (d: string) => d.slice(8, 10) + d.slice(5, 7)
  const searchLink = `${SITE}/search/${origin}${ddmm(dateFrom)}${destination}${ddmm(dateTo)}1`

  let partnerUrls: (string | null)[]
  try {
    partnerUrls = await toPartnerLinks(
      [
        ...raw.map((o: any) => `${SITE}${String(o.link).startsWith('/') ? '' : '/'}${o.link}`),
        searchLink,
      ],
      token,
      marker,
      trs
    )
  } catch (error) {
    return json({ error: (error as Error).message === 'rate_limit' ? 'Troppe richieste' : 'Link non disponibili' }, (error as Error).message === 'rate_limit' ? 429 : 502)
  }
  const searchUrl = partnerUrls[partnerUrls.length - 1] ?? undefined

  const offers = raw
    .map((o: any, i: number) => ({
      price: Number(o.price),
      currency: CURRENCY.toUpperCase(),
      airline: o.airline ? String(o.airline) : undefined,
      departureAt: String(o.departure_at),
      returnAt: o.return_at ? String(o.return_at) : undefined,
      transfers: Number.isFinite(Number(o.transfers)) ? Number(o.transfers) : undefined,
      url: partnerUrls[i],
    }))
    .filter((o: any) => !!o.url)

  // Nessun link convertito: quasi sempre il progetto non è iscritto al programma Aviasales
  if (offers.length === 0 && !searchUrl) return json({ error: 'Servizio voli non configurato' }, 503)

  return json({ offers, searchUrl, fetchedAt: new Date().toISOString() })
})
