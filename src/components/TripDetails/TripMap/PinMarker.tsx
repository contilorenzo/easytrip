import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Marker } from 'react-native-maps'
import Svg, { Circle, Path } from 'react-native-svg'

interface Props {
  coordinate: { latitude: number; longitude: number }
  color: string
  opacity?: number
  zIndex?: number
  onPress?: () => void
}

// Stesso pin a goccia della mappa del viaggio (senza numeri), ritagliato attorno alla forma
// perché l'area toccabile del marker coincide con la sua immagine
const WIDTH = 28
const HEIGHT = 31
const CROP_X = 3
const VISIBLE_WIDTH = WIDTH - CROP_X * 2
const CX = WIDTH / 2
const LEFT_X = 14
const RIGHT_X = WIDTH - 14

const PATH = `M${LEFT_X} 2 L${RIGHT_X} 2 A 9.5 9.5 0 0 1 ${RIGHT_X + 9.5} 11.5 C ${RIGHT_X + 9.5} 17 ${CX + 5} 24 ${CX} 29.5 C ${CX - 5} 24 ${LEFT_X - 9.5} 17 ${LEFT_X - 9.5} 11.5 A 9.5 9.5 0 0 1 ${LEFT_X} 2 Z`

const PinMarker = ({ coordinate, color, opacity = 1, zIndex = 1, onPress }: Props) => {
  // L'immagine del marker si "fotografa" una volta: lascio che si aggiorni solo per un attimo quando cambia
  const [tracksViewChanges, setTracksViewChanges] = useState(true)
  useEffect(() => {
    setTracksViewChanges(true)
    const timer = setTimeout(() => setTracksViewChanges(false), 600)
    return () => clearTimeout(timer)
  }, [color])

  return (
    <Marker
      coordinate={coordinate}
      tracksViewChanges={tracksViewChanges}
      opacity={opacity}
      zIndex={zIndex}
      anchor={{ x: 0.5, y: 29.5 / HEIGHT }}
      onPress={onPress}
    >
      <View
        style={{
          width: VISIBLE_WIDTH,
          height: HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1.5 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
        }}
      >
        <Svg width={VISIBLE_WIDTH} height={HEIGHT} viewBox={`${CROP_X} 0 ${VISIBLE_WIDTH} ${HEIGHT}`}>
          <Path d={PATH} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
          <Circle cx={CX} cy={11.5} r={2.8} fill="#FFFFFF" />
        </Svg>
      </View>
    </Marker>
  )
}

export default PinMarker
