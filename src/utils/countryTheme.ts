import { useState, useEffect } from 'react'

export interface CountryTheme {
  gradient: [string, string, ...string[]]
  accentColor: string
}

// In-memory cache for runtime-extracted themes
const flagThemeCache = new Map<string, CountryTheme>()

function hexToRgb(hex: string) {
  let clean = hex.replace('#', '')
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('')
  }
  const num = parseInt(clean.substring(0, 6), 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

const channelLuminance = (value: number) => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

// Rapporto di contrasto con il bianco (da 1 a 21)
const contrastOnWhite = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const luminance = 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
  return 1.05 / (luminance + 0.05)
}

// Il colore di accento si usa anche su fondo bianco (testi, icone): se è troppo chiaro (es. il giallo)
// lo scurisco finché non si legge bene, mantenendo lo stesso colore
export function readableAccent(color: string, minContrast = 4): string {
  if (!/^#[0-9a-f]{3,8}$/i.test(color)) return color
  try {
    let { r, g, b } = hexToRgb(color)
    const toHex = () => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
    for (let i = 0; i < 20 && contrastOnWhite(toHex()) < minContrast; i++) {
      r *= 0.9
      g *= 0.9
      b *= 0.9
    }
    return toHex()
  } catch {
    return color
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  try {
    const { r, g, b } = hexToRgb(hex)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  } catch {
    return `rgba(100, 100, 100, ${alpha})`
  }
}

function getBrightness(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000
}

function adjustBrightness(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  const adj = (x: number) => Math.round(Math.max(0, Math.min(255, x * factor)))
  return (
    '#' +
    [adj(r), adj(g), adj(b)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('')
  )
}

// ── Gradiente morbido ───────────────────────────────────────────────────────────────────────────────────────
// I colori della bandiera sono spesso lontani tra loro (rosso/verde/giallo): mescolati in RGB danno passaggi
// bruschi o fangosi. Qui li ordino per luminosità, li ripulisco e tra una coppia e l'altra inserisco colori
// intermedi calcolati nello spazio OKLCH (percettivo), così le transizioni sono graduali.
type Oklch = { L: number; C: number; h: number }

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const linearToSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function hexToOklch(hex: string): Oklch {
  const { r, g, b } = hexToRgb(hex)
  const R = srgbToLinear(r / 255)
  const G = srgbToLinear(g / 255)
  const B = srgbToLinear(b / 255)
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { L, C: Math.sqrt(a * a + bb * bb), h: (Math.atan2(bb, a) * 180) / Math.PI }
}

function oklchToHex({ L, C, h }: Oklch): string {
  const a = C * Math.cos((h * Math.PI) / 180)
  const b = C * Math.sin((h * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const channel = (v: number) =>
    Math.round(Math.max(0, Math.min(1, linearToSrgb(Math.max(0, Math.min(1, v))))) * 255)
      .toString(16)
      .padStart(2, '0')
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return '#' + channel(R) + channel(G) + channel(B)
}

// Interpolazione tra due colori. Se le tinte sono vicine (< 70°) seguo la ruota dei colori (OKLCH): il passaggio resta
// nella stessa famiglia. Se sono lontane passo in linea retta nello spazio OKLab, cioè per un colore neutro intermedio:
// così non compaiono tinte nuove (l'arancio e l'oliva tra rosso e verde) e il gradiente usa solo i colori della bandiera.
function mixOklch(from: Oklch, to: Oklch, t: number): Oklch {
  const fromGray = from.C < 0.02
  const toGray = to.C < 0.02

  let hueDiff = to.h - from.h
  if (hueDiff > 180) hueDiff -= 360
  if (hueDiff < -180) hueDiff += 360

  if (fromGray || toGray || Math.abs(hueDiff) < 70) {
    const hue = fromGray ? to.h : toGray ? from.h : from.h + hueDiff * t
    return { L: from.L + (to.L - from.L) * t, C: from.C + (to.C - from.C) * t, h: hue }
  }

  const toLab = (c: Oklch) => ({ L: c.L, a: c.C * Math.cos((c.h * Math.PI) / 180), b: c.C * Math.sin((c.h * Math.PI) / 180) })
  const labFrom = toLab(from)
  const labTo = toLab(to)
  const L = labFrom.L + (labTo.L - labFrom.L) * t
  const a = labFrom.a + (labTo.a - labFrom.a) * t
  const b = labFrom.b + (labTo.b - labFrom.b) * t
  return { L, C: Math.sqrt(a * a + b * b), h: (Math.atan2(b, a) * 180) / Math.PI }
}

// I colori della bandiera restano quelli originali: li correggo solo negli estremi (quasi nero / quasi bianco)
const MIN_LIGHTNESS = 0.2
const MAX_LIGHTNESS = 0.85 // sotto il testo bianco i colori quasi bianchi non si leggono
const MIN_DISTINCT_DISTANCE = 0.06 // sotto questa distanza due colori sono "lo stesso" e li unisco
const MAX_GRADIENT_COLORS = 3
const INTERMEDIATE_STOPS = 1 // colori inseriti tra due colori della bandiera

const smoothGradientCache = new Map<string, [string, string, ...string[]]>()

export function buildSmoothGradient(colors: string[]): [string, string, ...string[]] {
  const cacheKey = colors.join(',')
  const cached = smoothGradientCache.get(cacheKey)
  if (cached) return cached

  const clampL = (c: Oklch): Oklch => ({ ...c, L: Math.max(MIN_LIGHTNESS, Math.min(MAX_LIGHTNESS, c.L)) })

  // Colori distinti, al massimo MAX_GRADIENT_COLORS, nell'ordine di rilevanza
  const distinct: Oklch[] = []
  for (const hex of colors) {
    const color = clampL(hexToOklch(hex))
    const a1 = color.C * Math.cos((color.h * Math.PI) / 180)
    const b1 = color.C * Math.sin((color.h * Math.PI) / 180)
    const isDuplicate = distinct.some((d) => {
      const a2 = d.C * Math.cos((d.h * Math.PI) / 180)
      const b2 = d.C * Math.sin((d.h * Math.PI) / 180)
      return Math.sqrt((color.L - d.L) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2) < MIN_DISTINCT_DISTANCE
    })
    if (!isDuplicate) distinct.push(color)
    if (distinct.length === MAX_GRADIENT_COLORS) break
  }

  let base = distinct
  if (base.length === 0) base = [clampL(hexToOklch('#FF5A5F'))]
  // Un solo colore: variazioni più scura e più chiara dello stesso
  if (base.length === 1) {
    const only = base[0]
    base = [{ ...only, L: Math.max(MIN_LIGHTNESS, only.L - 0.1) }, only, { ...only, L: Math.min(MAX_LIGHTNESS, only.L + 0.1) }]
  } else {
    // Dal più scuro al più chiaro: i passaggi di luminosità sono la parte più morbida di un gradiente
    base = [...base].sort((x, y) => x.L - y.L)
  }

  const stops: string[] = []
  base.forEach((color, i) => {
    stops.push(oklchToHex(color))
    const next = base[i + 1]
    if (!next) return
    for (let k = 1; k <= INTERMEDIATE_STOPS; k++) {
      stops.push(oklchToHex(mixOklch(color, next, k / (INTERMEDIATE_STOPS + 1))))
    }
  })

  const result = stops as [string, string, ...string[]]
  smoothGradientCache.set(cacheKey, result)
  return result
}

function isNeutral(hex: string) {
  const brightness = getBrightness(hex)
  return brightness > 235 || brightness < 20
}

/**
 * Curated preset fallbacks used as instant placeholders while runtime flag file extraction finishes.
 */
const PRESET_FALLBACKS: Record<string, CountryTheme> = {
  it: { gradient: ['#009246', '#057A55', '#CE2B37'], accentColor: '#009246' },
  fr: { gradient: ['#002654', '#1E40AF', '#CE1126'], accentColor: '#1E40AF' },
  es: { gradient: ['#AD1519', '#EA580C', '#FABD00'], accentColor: '#AD1519' },
  de: { gradient: ['#18181B', '#DD0000', '#FFCE00'], accentColor: '#DD0000' },
  gb: { gradient: ['#012169', '#1E40AF', '#C8102E'], accentColor: '#C8102E' },
  uk: { gradient: ['#012169', '#1E40AF', '#C8102E'], accentColor: '#C8102E' },
  us: { gradient: ['#0A3161', '#2563EB', '#B31942'], accentColor: '#B31942' },
  jp: { gradient: ['#881337', '#BC002D', '#F43F5E'], accentColor: '#BC002D' },
  gr: { gradient: ['#09427A', '#0D5EAF', '#38BDF8'], accentColor: '#0D5EAF' },
  pt: { gradient: ['#047857', '#059669', '#DC2626'], accentColor: '#047857' },
  nl: { gradient: ['#C2410C', '#EA580C', '#1E40AF'], accentColor: '#EA580C' },
  br: { gradient: ['#009440', '#FFCB00', '#302681'], accentColor: '#009440' },
}

export const getFallbackTheme = (code: string): CountryTheme => {
  if (PRESET_FALLBACKS[code]) {
    const preset = PRESET_FALLBACKS[code]
    return { ...preset, accentColor: readableAccent(preset.accentColor), gradient: buildSmoothGradient(preset.gradient) }
  }

  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue1 = Math.abs(hash % 360)
  const hue2 = (hue1 + 45) % 360

  const color1 = `hsl(${hue1}, 75%, 42%)`
  const color2 = `hsl(${hue2}, 80%, 48%)`
  const color3 = `hsl(${(hue2 + 30) % 360}, 85%, 54%)`

  return {
    gradient: [color1, color2, color3],
    accentColor: color1,
  }
}

/**
 * Extracts flag colors directly from the country's SVG flag file at runtime.
 */
export const extractFlagTheme = async (countryCode?: string): Promise<CountryTheme> => {
  if (!countryCode) {
    return {
      gradient: ['#E11D48', '#FF5A5F', '#FF7A59'],
      accentColor: '#FF5A5F',
    }
  }

  const code = countryCode.toLowerCase().trim()
  if (flagThemeCache.has(code)) {
    return flagThemeCache.get(code)!
  }

  try {
    const res = await fetch(`https://flagcdn.com/${code}.svg`)
    if (!res.ok) {
      throw new Error(`Flag not found for ${code}`)
    }
    const svgText = await res.text()

    // Extract all hex colors from the SVG XML
    const hexMatches = svgText.match(/#[0-9a-fA-F]{3,8}\b/g) || []
    const normalized = hexMatches.map(h => {
      let clean = h.toLowerCase()
      if (clean.length === 4) {
        clean = '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3]
      }
      return clean.substring(0, 7)
    })

    // Frequency analysis
    const counts = new Map<string, number>()
    normalized.forEach(h => {
      counts.set(h, (counts.get(h) || 0) + 1)
    })

    // Sort by prominence
    const sorted = Array.from(counts.keys()).sort(
      (a, b) => (counts.get(b) || 0) - (counts.get(a) || 0)
    )

    // Separate chromatic colors from neutrals (whites/blacks)
    const chromatic = sorted.filter(c => !isNeutral(c))
    const validColors = chromatic.length > 0 ? chromatic : sorted

    const accentColor = readableAccent(validColors[0] || '#FF5A5F')

    // Parto dai colori più rilevanti (qualcuno in più dei 3 finali: i quasi-duplicati vengono scartati)
    const gradient = buildSmoothGradient(validColors.slice(0, 6))

    const theme: CountryTheme = { gradient, accentColor }
    flagThemeCache.set(code, theme)
    return theme
  } catch (error) {
    console.warn(`[countryTheme] Failed to extract runtime colors for ${code}:`, error)
    const fallbackTheme = getFallbackTheme(code)
    flagThemeCache.set(code, fallbackTheme)
    return fallbackTheme
  }
}

/**
 * React hook that returns the country's theme extracted at runtime from the flag file.
 */
export const useFlagTheme = (countryCode?: string): CountryTheme => {
  const code = (countryCode || '').toLowerCase().trim()
  const [theme, setTheme] = useState<CountryTheme>(() => {
    if (flagThemeCache.has(code)) {
      return flagThemeCache.get(code)!
    }
    return getFallbackTheme(code)
  })

  useEffect(() => {
    let isMounted = true
    if (!code) return

    if (flagThemeCache.has(code)) {
      setTheme(flagThemeCache.get(code)!)
      return
    }

    extractFlagTheme(code).then(extracted => {
      if (isMounted) {
        setTheme(extracted)
      }
    })

    return () => {
      isMounted = false
    }
  }, [code])

  return theme
}
