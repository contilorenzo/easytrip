interface LatLng {
  latitude: number
  longitude: number
}

// Addolcisce gli angoli di un percorso con il taglio degli spigoli di Chaikin: a ogni giro sostituisce ogni segmento
// con due punti a 1/4 e 3/4. La curva non passa esattamente per i vertici originali (va bene: il percorso è indicativo),
// ma dopo una forte semplificazione le curve non sembrano più spezzate. Primo e ultimo punto restano al loro posto.
export const smoothPath = <T extends LatLng>(points: T[], iterations = 2): T[] => {
  let current = points
  for (let n = 0; n < iterations; n++) {
    if (current.length < 3) return current
    const next: T[] = [current[0]]
    for (let i = 0; i < current.length - 1; i++) {
      const a = current[i]
      const b = current[i + 1]
      next.push({
        ...a,
        latitude: a.latitude * 0.75 + b.latitude * 0.25,
        longitude: a.longitude * 0.75 + b.longitude * 0.25,
      })
      next.push({
        ...b,
        latitude: a.latitude * 0.25 + b.latitude * 0.75,
        longitude: a.longitude * 0.25 + b.longitude * 0.75,
      })
    }
    next.push(current[current.length - 1])
    current = next
  }
  return current
}
