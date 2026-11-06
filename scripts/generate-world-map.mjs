// Genera src/assets/worldMapPaths.json: i confini dei paesi come tracciati SVG, già proiettati.
// Dati: Natural Earth (pubblico dominio) — https://www.naturalearthdata.com
// Uso: node scripts/generate-world-map.mjs
import { writeFileSync } from 'node:fs'

const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'
const WIDTH = 1000
// Proiezione di Miller: come Mercator le forme restano naturali (a nord e a sud i paesi non sono schiacciati)
// ma i paesi vicini ai poli sono meno ingranditi. Si tagliano i poli: niente Antartide e un po' di Artico
const LAT_MAX = 82
const LAT_MIN = -56
const mercatorY = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * ((lat * Math.PI) / 180)))
const Y_TOP = mercatorY(LAT_MAX)
const Y_BOTTOM = mercatorY(LAT_MIN)
const HEIGHT = Math.round(((Y_TOP - Y_BOTTOM) / (2 * Math.PI)) * WIDTH)
const TOLERANCE = 0.1 // gradi: semplificazione dei tracciati
const MIN_RING_AREA = 0.25 // gradi²: scarto le isolette più piccole (ma tengo sempre l'anello principale)

// Paesi che in Natural Earth non hanno il codice ISO nel campo standard
const CODE_BY_NAME = { Kosovo: 'xk', France: 'fr', Norway: 'no' }

const project = ([lon, lat]) => [
  ((lon + 180) / 360) * WIDTH,
  ((Y_TOP - mercatorY(Math.min(Math.max(lat, LAT_MIN), LAT_MAX))) / (Y_TOP - Y_BOTTOM)) * HEIGHT,
]

const ringArea = (ring) => {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  return Math.abs(area / 2)
}

// Douglas-Peucker
const simplify = (points, tolerance) => {
  if (points.length < 4) return points
  const sqTol = tolerance * tolerance
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()
    let maxDist = 0
    let index = 0
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i]
      const [ax, ay] = points[first]
      const [bx, by] = points[last]
      const dx = bx - ax
      const dy = by - ay
      const lenSq = dx * dx + dy * dy
      let t = lenSq ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0
      t = Math.max(0, Math.min(1, t))
      const distSq = (px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2
      if (distSq > maxDist) {
        maxDist = distSq
        index = i
      }
    }
    if (maxDist > sqTol) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

const response = await fetch(SOURCE)
const geojson = await response.json()

const countries = []
for (const feature of geojson.features) {
  const props = feature.properties
  let code = (props.ISO_A2_EH && props.ISO_A2_EH !== '-99' ? props.ISO_A2_EH : props.ISO_A2 !== '-99' ? props.ISO_A2 : CODE_BY_NAME[props.NAME])?.toLowerCase()
  if (!code) continue
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  const rings = polygons.map((polygon) => polygon[0]).sort((a, b) => ringArea(b) - ringArea(a))
  let d = ''
  rings.forEach((ring, index) => {
    if (index > 0 && ringArea(ring) < MIN_RING_AREA) return
    const simplified = simplify(ring, TOLERANCE)
    if (simplified.length < 3) return
    d += 'M' + simplified.map((point) => project(point).map((v) => Math.round(v * 10) / 10).join(',')).join('L') + 'Z'
  })
  if (d) countries.push({ code, d })
}

// Più feature con lo stesso codice (es. isole): le unisco
const merged = new Map()
for (const country of countries) merged.set(country.code, (merged.get(country.code) ?? '') + country.d)

const output = { width: WIDTH, height: HEIGHT, countries: [...merged].map(([code, d]) => ({ code, d })) }
writeFileSync(new URL('../src/assets/worldMapPaths.json', import.meta.url), JSON.stringify(output))
console.log(`${output.countries.length} paesi, ${Math.round(JSON.stringify(output).length / 1024)} KB, mappa ${WIDTH}x${HEIGHT}`)
