import { useEffect, useState } from 'react'
import { Image } from 'react-native'

// Proporzioni reali delle bandiere già lette (la maggior parte è 3:2, alcune quadrate o più strette)
const aspectCache = new Map<string, number>()
const DEFAULT_ASPECT = 1.5

const CountryFlag = ({
  countryCode,
  height = 20,
  borderRadius,
  resolution = 'w320',
}: Props) => {
  const code = countryCode.toLowerCase()
  const uri = `https://flagcdn.com/${resolution}/${code}.webp`

  // La bandiera si vede sempre intera: il contenitore prende le sue proporzioni (a parità di altezza)
  // e ha gli angoli leggermente arrotondati, senza ritagli
  const [aspect, setAspect] = useState(aspectCache.get(code) ?? DEFAULT_ASPECT)
  useEffect(() => {
    if (aspectCache.has(code)) return
    let active = true
    Image.getSize(
      uri,
      (w, h) => {
        if (!h) return
        aspectCache.set(code, w / h)
        if (active) setAspect(w / h)
      },
      () => {}
    )
    return () => {
      active = false
    }
  }, [code])

  return (
    <Image
      source={{ uri, height, width: Math.round(height * aspect) }}
      style={{
        resizeMode: 'contain',
        borderRadius: borderRadius ?? Math.max(2, height * 0.14),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
      }}
    />
  )
}

interface Props {
  countryCode: string
  height: number
  // Non più usati: la forma segue sempre le proporzioni della bandiera (restano per compatibilità)
  width?: number
  isCircle?: boolean
  borderRadius?: number
  // Dimensione dell'immagine scaricata (w20, w40, w80, w160, w320…): per le liste conviene una piccola
  resolution?: string
}

export default CountryFlag
