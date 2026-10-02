interface LatLng {
  latitude: number
  longitude: number
}

// Distanza al quadrato (in gradi) tra un punto e un segmento; la longitudine è scalata con la latitudine per non deformare
const squaredSegmentDistance = (p: LatLng, a: LatLng, b: LatLng, lngScale: number) => {
  const px = p.longitude * lngScale
  const py = p.latitude
  let x = a.longitude * lngScale
  let y = a.latitude
  const dx = b.longitude * lngScale - x
  const dy = b.latitude - y

  if (dx !== 0 || dy !== 0) {
    const t = Math.max(0, Math.min(1, ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy)))
    x += dx * t
    y += dy * t
  }
  return (px - x) ** 2 + (py - y) ** 2
}

// Semplifica un percorso (algoritmo di Ramer–Douglas–Peucker, iterativo): toglie i punti che deviano meno di
// `tolerance` gradi dalla linea (0.000045° ≈ 5 metri) e tiene la forma. I percorsi di Mapbox hanno migliaia di punti
// quasi allineati: ridisegnarli sulla mappa nativa a ogni passo dell'animazione fa lagare i telefoni meno potenti.
export const simplifyPath = <T extends LatLng>(points: T[], tolerance = 0.000045): T[] => {
  if (points.length < 3) return points

  const last = points.length - 1
  const lngScale = Math.cos(((points[0].latitude + points[last].latitude) / 2) * (Math.PI / 180))
  const toleranceSquared = tolerance * tolerance

  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[last] = 1

  const stack: [number, number][] = [[0, last]]
  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number]
    let maxDistance = 0
    let index = -1
    for (let i = start + 1; i < end; i++) {
      const distance = squaredSegmentDistance(points[i], points[start], points[end], lngScale)
      if (distance > maxDistance) {
        maxDistance = distance
        index = i
      }
    }
    if (index !== -1 && maxDistance > toleranceSquared) {
      keep[index] = 1
      stack.push([start, index], [index, end])
    }
  }

  return points.filter((_, i) => keep[i] === 1)
}
