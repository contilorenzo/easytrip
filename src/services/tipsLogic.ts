// Logica pura dei consigli di viaggio (testabile con `npm test`)

export type TipKind = 'experiences' | 'luggage' | 'car' | 'transfer' | 'esim'

export interface Tip {
  kind: TipKind
  partner: string
  // Link di affiliazione già pronto, costruito dal server
  url: string
  // true se il link porta già alla città scelta, false se apre il sito del partner
  cityLevel: boolean
  // true se il link porta già le date del viaggio
  dated: boolean
}

const KINDS: TipKind[] = ['experiences', 'luggage', 'car', 'transfer', 'esim']

// Valida la risposta del server: scarta tipi sconosciuti e link non https; ordine fisso
export const parseTips = (raw: unknown): Tip[] => {
  const list = Array.isArray((raw as any)?.items) ? (raw as any).items : []
  const tips: Tip[] = []
  for (const item of list) {
    if (!KINDS.includes(item?.kind)) continue
    if (typeof item?.url !== 'string' || !/^https:\/\//.test(item.url)) continue
    if (typeof item?.partner !== 'string' || !item.partner) continue
    if (tips.some((t) => t.kind === item.kind)) continue
    tips.push({ kind: item.kind, partner: item.partner, url: item.url, cityLevel: item.cityLevel === true, dated: item.dated === true })
  }
  return tips.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
}

export const TIPS_TTL_MS = 7 * 24 * 60 * 60 * 1000
export interface TipsQuery {
  city: string
  country: string
  dateFrom: string
  dateTo: string
}

export const tipsCacheKey = (q: TipsQuery) => `tips5.${q.country.toLowerCase()}.${q.city.trim().toLowerCase()}.${q.dateFrom}.${q.dateTo}`

interface Storage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

// Consigli per una città: cache di 7 giorni; se il server non risponde si usa l'ultima copia; non lancia mai
export const tipsWith = async (
  query: TipsQuery,
  deps: { fetchRemote: (q: TipsQuery) => Promise<unknown>; storage: Storage; now?: () => number }
): Promise<Tip[]> => {
  const now = deps.now ?? Date.now
  const key = tipsCacheKey(query)
  let cached: { tips: Tip[]; at: number } | null = null
  try {
    const text = await deps.storage.getItem(key)
    if (text) {
      const parsed = JSON.parse(text)
      const tips = parseTips({ items: parsed?.tips })
      if (tips.length > 0 && Number.isFinite(parsed.at)) cached = { tips, at: parsed.at }
    }
  } catch {}
  if (cached && now() - cached.at < TIPS_TTL_MS) return cached.tips
  try {
    const tips = parseTips(await deps.fetchRemote(query))
    if (tips.length > 0) {
      try {
        await deps.storage.setItem(key, JSON.stringify({ tips, at: now() }))
      } catch {}
      return tips
    }
  } catch {}
  return cached?.tips ?? []
}
