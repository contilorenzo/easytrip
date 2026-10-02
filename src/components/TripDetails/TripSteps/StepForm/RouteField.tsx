import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import { Platform, View } from 'react-native'
import { Location } from '../types'
import LocationField from './LocationField'
import LocationPickerMap, { USE_LEAFLET_PICKER } from './LocationPickerMap'
import MapView, { Marker, Polyline } from 'react-native-maps'
import { t } from '../../../../translations'
import { TranslationsKeys } from '../../../../translations/types'
import { MAPBOX_TOKEN } from '../../../../utils/mapbox'

const RouteField = ({
  departure,
  setDeparture,
  arrival,
  setArrival,
  backgroundLocations,
  defaultCenter,
}: Props) => {
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([])

  useEffect(() => {
    const fetchRoute = async () => {
      if (departure && arrival) {
        try {
          const accessToken = MAPBOX_TOKEN
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${departure.coordinates.lng},${departure.coordinates.lat};${arrival.coordinates.lng},${arrival.coordinates.lat}?geometries=geojson&access_token=${accessToken}`
          )
          const data = await response.json()
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map((coord: any) => ({
              latitude: coord[1],
              longitude: coord[0]
            }))
            setRouteCoords(coords)
          } else {
            setRouteCoords([])
          }
        } catch (e) {
          console.error(e)
          setRouteCoords([])
        }
      } else {
        setRouteCoords([])
      }
    }
    fetchRoute()
  }, [departure, arrival])
  const getRegion = () => {
    if (departure && arrival) {
      const minLat = Math.min(departure.coordinates.lat, arrival.coordinates.lat)
      const maxLat = Math.max(departure.coordinates.lat, arrival.coordinates.lat)
      const minLng = Math.min(departure.coordinates.lng, arrival.coordinates.lng)
      const maxLng = Math.max(departure.coordinates.lng, arrival.coordinates.lng)

      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) * 1.5 || 0.05,
        longitudeDelta: (maxLng - minLng) * 1.5 || 0.05,
      }
    }
    if (departure) {
      return {
        latitude: departure.coordinates.lat,
        longitude: departure.coordinates.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    }
    if (arrival) {
      return {
        latitude: arrival.coordinates.lat,
        longitude: arrival.coordinates.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    }
    if (defaultCenter) {
      return {
        latitude: defaultCenter.coordinates.lat,
        longitude: defaultCenter.coordinates.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    }

    return {
      latitude: 41.9028,
      longitude: 12.4964,
      latitudeDelta: 10,
      longitudeDelta: 10,
    }
  }
  const lastPoiPressRef = useRef(0)

  const onMapPress = (e: any) => {
    // Su Android il tap su un POI genera anche onPress: lo ignoro
    if (Date.now() - lastPoiPressRef.current < 500) return
    const { latitude, longitude } = e.nativeEvent.coordinate
    return pickAt(latitude, longitude)
  }

  const onPoiPress = (e: any) => {
    lastPoiPressRef.current = Date.now()
    const { coordinate, name } = e.nativeEvent
    return pickAt(coordinate.latitude, coordinate.longitude, name)
  }

  const pickAt = async (latitude: number, longitude: number, poiName?: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        { headers: { 'User-Agent': 'EasyTrip/1.0', Accept: 'application/json' } }
      )
      // Se Nominatim risponde con un errore non JSON (es. blocco/rate limit) uso le coordinate
      let data: any = null
      try {
        data = JSON.parse(await response.text())
      } catch {
        data = null
      }

      const newLocation = {
        name: poiName || (data && !data.error ? (data.name || data.display_name.split(',')[0]) : 'Posizione selezionata'),
        address: data && !data.error ? data.display_name : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        coordinates: { lat: latitude, lng: longitude },
      }

      if (!departure) {
        setDeparture(newLocation)
      } else if (!arrival) {
        setArrival(newLocation)
      } else {
        setDeparture(newLocation)
        setArrival(undefined)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <View style={{ gap: 20 }}>
      <LocationField
        label={'Partenza'}
        location={departure}
        setLocation={setDeparture}
        hideMap
      />
      <LocationField
        label={'Arrivo'}
        location={arrival}
        setLocation={setArrival}
        hideMap
      />

      {USE_LEAFLET_PICKER && Platform.OS === 'android' && (
        <LocationPickerMap
          markers={[
            ...(departure ? [{ location: departure, color: '#16A34A' }] : []),
            ...(arrival ? [{ location: arrival, color: '#EF4444' }] : []),
          ]}
          backgroundLocations={backgroundLocations}
          routeCoords={departure && arrival ? (routeCoords.length > 0 ? routeCoords : [
            { latitude: departure.coordinates.lat, longitude: departure.coordinates.lng },
            { latitude: arrival.coordinates.lat, longitude: arrival.coordinates.lng },
          ]) : undefined}
          onPick={pickAt}
        />
      )}

      {!(USE_LEAFLET_PICKER && Platform.OS === 'android') && (
      <MapView
        style={{ width: '100%', height: 250, marginTop: 10, borderRadius: 8 }}
        region={getRegion()}
        mapType="hybrid"
        onPress={onMapPress}
        onPoiClick={onPoiPress}
      >
        {backgroundLocations?.map((loc, i) => {
          if (departure && loc.coordinates.lat === departure.coordinates.lat && loc.coordinates.lng === departure.coordinates.lng) return null
          if (arrival && loc.coordinates.lat === arrival.coordinates.lat && loc.coordinates.lng === arrival.coordinates.lng) return null
          return (
            <Marker
              key={`bg_${i}`}
              coordinate={{
                latitude: loc.coordinates.lat,
                longitude: loc.coordinates.lng,
              }}
              pinColor="#a0a0a0"
              opacity={0.5}
              title={loc.name}
            />
          )
        })}
        {departure && (
          <Marker
            coordinate={{
              latitude: departure.coordinates.lat,
              longitude: departure.coordinates.lng,
            }}
            title={departure.name}
            pinColor="green"
          />
        )}
        {arrival && (
          <Marker
            coordinate={{
              latitude: arrival.coordinates.lat,
              longitude: arrival.coordinates.lng,
            }}
            title={arrival.name}
            pinColor="red"
          />
        )}
        {departure && arrival && (
          <Polyline
            coordinates={routeCoords.length > 0 ? routeCoords : [
              {
                latitude: departure.coordinates.lat,
                longitude: departure.coordinates.lng,
              },
              {
                latitude: arrival.coordinates.lat,
                longitude: arrival.coordinates.lng,
              },
            ]}
            strokeColor="tomato"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>
      )}
    </View>
  )
}

interface Props {
  departure?: Location
  setDeparture: Dispatch<SetStateAction<Location | undefined>>
  arrival?: Location
  setArrival: Dispatch<SetStateAction<Location | undefined>>
  backgroundLocations?: Location[]
  defaultCenter?: Location
}

export default RouteField
