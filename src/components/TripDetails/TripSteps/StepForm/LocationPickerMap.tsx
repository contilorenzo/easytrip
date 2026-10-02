import { useMemo } from 'react'
import { View, ViewStyle } from 'react-native'
import { Location } from '../types'
import LeafletMap from '../../TripMap/LeafletMap'

// Selettore Leaflet (Android) tenuto in parallelo ma disattivato: ora si usa la mappa Google nativa con onPoiClick.
// Metti a true per riattivarlo.
export const USE_LEAFLET_PICKER = false

const BACKGROUND_DAY = 'background'
const ROUTE_DAY = 'route'

const BACKGROUND_COLOR = '#9CA3AF'
const ROUTE_COLOR = 'tomato'

// Mappa Leaflet (Android) per scegliere una posizione: mostra tutti i POI di Google Maps
// e un tap qualsiasi sulla mappa seleziona il punto.
const LocationPickerMap = ({
  markers,
  backgroundLocations,
  routeCoords,
  onPick,
  style,
}: Props) => {
  // I chiamanti passano array nuovi a ogni render: li stabilizzo per non reinviare i dati al WebView di continuo
  const backgroundKey = JSON.stringify(backgroundLocations ?? [])
  const routeKey = JSON.stringify(routeCoords ?? [])
  const markersKey = JSON.stringify(markers)

  const groupedPoints = useMemo(
    () => ({ [BACKGROUND_DAY]: JSON.parse(backgroundKey) as Location[], [ROUTE_DAY]: [] as Location[] }),
    [backgroundKey]
  )
  const routesByDay = useMemo(
    () => ({ [ROUTE_DAY]: JSON.parse(routeKey) as { latitude: number; longitude: number }[] }),
    [routeKey]
  )
  const days = useMemo(() => [BACKGROUND_DAY, ROUTE_DAY], [])
  const pickMarkers = useMemo(
    () =>
      (JSON.parse(markersKey) as Props['markers']).map((m) => ({
        lat: m.location.coordinates.lat,
        lng: m.location.coordinates.lng,
        color: m.color,
      })),
    [markersKey]
  )

  return (
    <View style={[containerStyles, style]}>
      <LeafletMap
        steps={[]}
        groupedPoints={groupedPoints}
        routesByDay={routesByDay}
        selectedDay="ALL"
        selectedStep={null}
        userLocation={null}
        getDayColor={(day) => (day === ROUTE_DAY ? ROUTE_COLOR : BACKGROUND_COLOR)}
        days={days}
        pickMode
        pickMarkers={pickMarkers}
        onPickLocation={onPick}
      />
    </View>
  )
}

const containerStyles: ViewStyle = {
  width: '100%',
  height: 230,
  marginTop: 4,
  borderRadius: 16,
  overflow: 'hidden',
}

export default LocationPickerMap

interface Props {
  markers: { location: Location; color: string }[]
  backgroundLocations?: Location[]
  routeCoords?: { latitude: number; longitude: number }[]
  onPick: (lat: number, lng: number) => void
  style?: ViewStyle
}
