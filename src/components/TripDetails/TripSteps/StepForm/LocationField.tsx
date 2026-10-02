import { Dispatch, SetStateAction, useState, useEffect, useRef } from 'react'
import { Location } from '../types'
import TextField from '../../../FormElements/TextField'
import {
  Linking,
  Platform,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { t } from '../../../../translations'
import { TranslationsKeys } from '../../../../translations/types'
import MapView from 'react-native-maps'
import PinMarker from '../../TripMap/PinMarker'
import { reverseAddress, reverseGeocodeWithPoi } from '../../../../services/geocoding'
import LocationPickerMap, { USE_LEAFLET_PICKER } from './LocationPickerMap'



const LocationField = ({ location, setLocation, label, hideMap, backgroundLocations, defaultCenter }: Props) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        onLocationSearch(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const onLocationSearch = async (query: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`
      )
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error(error)
    }
  }

  const openInMapsApp = (location: Location) => {
    const address = location.address
    const coordinatesString = `${location.coordinates.lat},${location.coordinates.lng}`

    const url = Platform.select({
      ios: `maps:${coordinatesString}?q=${address}`,
      android: `geo:${coordinatesString}?q=${address}`,
    })

    Linking.openURL(url)
  }

  const lastPoiPressRef = useRef(0)
  // Regione visibile della mappa: serve a stimare quanto è grande un dito sulla mappa, in metri
  const regionRef = useRef<{ latitudeDelta: number } | null>(null)

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
      // Tocco su un luogo noto alla mappa (Google Maps): nome e coordinate arrivano già dall'evento
      if (poiName) {
        const address = await reverseAddress(latitude, longitude)
        setLocation({ name: poiName, address, coordinates: { lat: latitude, lng: longitude } })
        setSearchQuery('')
        return
      }

      // Altrimenti (Apple Maps su iOS, o tocco su un punto qualsiasi) cerco il luogo più vicino al tocco e ci aggancio il
      // pin: la distanza utile è circa il 5% dell'altezza della mappa visibile (qualche millimetro di dito), tra 30 e 400 m
      const visibleMeters = (regionRef.current?.latitudeDelta ?? 0.01) * 111000
      const maxSnapMeters = Math.min(Math.max(visibleMeters * 0.05, 30), 400)
      const result = await reverseGeocodeWithPoi(latitude, longitude, maxSnapMeters)

      setLocation({ name: result.name, address: result.address, coordinates: result.coordinates })
      setSearchQuery('')
    } catch (error) {
      console.error(error)
    }
  }

  const selectResult = (result: any) => {
    setSearchResults([])
    setLocation({
      name: result.name || result.display_name.split(',')[0],
      address: result.display_name,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      },
    })
    setSearchQuery('')
  }

  const mapRegion = location
    ? {
        latitude: location.coordinates.lat,
        longitude: location.coordinates.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : defaultCenter
    ? {
        latitude: defaultCenter.coordinates.lat,
        longitude: defaultCenter.coordinates.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : {
        latitude: 41.9028,
        longitude: 12.4964,
        latitudeDelta: 10,
        longitudeDelta: 10,
      }

  const isAndroidLeaflet = USE_LEAFLET_PICKER && Platform.OS === 'android'

  return (
    <View style={{ gap: 12 }}>
      {/* 1. Ricerca */}
      <View>
        <TextField
          label={label ?? t(TranslationsKeys.location)}
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cerca un luogo o un indirizzo"
        />
        {searchResults.length > 0 && (
          <View style={resultsListStyles}>
            {searchResults.map((result: any, index: number) => (
              <TouchableOpacity
                key={result.place_id + '_' + index}
                onPress={() => selectResult(result)}
                style={searchResultStyles}
                disabled={!searchQuery}
              >
                <Text numberOfLines={2} style={searchResultTextStyles}>
                  {result.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 2. Mappa (il contenitore stondato serve su Android, dove la mappa non rispetta gli angoli da sola) */}
      {!hideMap && isAndroidLeaflet && (
        <LocationPickerMap
          markers={location ? [{ location, color: '#EF4444' }] : []}
          backgroundLocations={backgroundLocations}
          onPick={pickAt}
        />
      )}

      {!hideMap && !isAndroidLeaflet && (
        <View style={mapContainerStyles}>
          <MapView
            style={{ flex: 1 }}
            region={mapRegion}
            mapType="hybrid"
            onPress={onMapPress}
            onPoiClick={onPoiPress}
            onRegionChangeComplete={(r) => {
              regionRef.current = r
            }}
          >
            {/* Tappe già salvate: pin grigi e opachi */}
            {backgroundLocations?.map((loc, i) => {
              if (location && loc.coordinates.lat === location.coordinates.lat && loc.coordinates.lng === location.coordinates.lng) return null
              return (
                <PinMarker
                  key={`bg_${i}`}
                  coordinate={{ latitude: loc.coordinates.lat, longitude: loc.coordinates.lng }}
                  color="#9CA3AF"
                  opacity={0.5}
                  zIndex={1}
                />
              )
            })}
            {location && (
              <PinMarker
                coordinate={{ latitude: location.coordinates.lat, longitude: location.coordinates.lng }}
                color="#FF5A5F"
                zIndex={10}
              />
            )}
          </MapView>
        </View>
      )}

      {/* 3. Posizione selezionata */}
      {location && (
        <View style={locationContainerStyles}>
          <View style={locationIconStyles}>
            <Ionicons name="location" size={18} color="#FF5A5F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={locationNameStyles} numberOfLines={1}>
              {location?.name}
            </Text>
            <Text style={locationAddressStyles} numberOfLines={2}>
              {location?.address}
            </Text>
          </View>
          <TouchableOpacity style={editButtonStyles} onPress={() => openInMapsApp(location)} activeOpacity={0.8}>
            <Ionicons name="navigate-outline" size={13} color="#4B5563" />
            <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '700' }}>Apri</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const searchStyles: ViewStyle = {
  alignItems: 'flex-end',
  display: 'flex',
  flexDirection: 'row',
  width: '100%',
}

const textFieldStyles: ViewStyle = {
  flexGrow: 1,
}

const searchResultStyles: ViewStyle = {
  backgroundColor: 'white',
  borderBottomColor: '#F3F4F6',
  borderBottomWidth: 1,
  paddingVertical: 11,
  paddingHorizontal: 14,
}

const resultsListStyles: ViewStyle = {
  backgroundColor: 'white',
  borderRadius: 14,
  overflow: 'hidden',
  marginTop: 6,
  borderWidth: 1,
  borderColor: '#F1F5F9',
}

const searchResultTextStyles: TextStyle = {
  fontSize: 13.5,
  color: '#1F2937',
  fontWeight: '500',
}

const mapContainerStyles: ViewStyle = {
  width: '100%',
  height: 230,
  borderRadius: 16,
  overflow: 'hidden',
}

const locationContainerStyles: ViewStyle = {
  alignItems: 'center',
  flexDirection: 'row',
  gap: 10,
  width: '100%',
  backgroundColor: '#F3F4F6',
  borderRadius: 14,
  padding: 10,
}

const locationIconStyles: ViewStyle = {
  width: 36,
  height: 36,
  borderRadius: 12,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
}

const locationNameStyles: TextStyle = {
  fontSize: 14.5,
  fontWeight: '800',
  color: '#111827',
}

const locationAddressStyles: TextStyle = {
  fontSize: 12,
  color: '#6B7280',
  marginTop: 1,
}

const editButtonStyles: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: 12,
  gap: 4,
}

export default LocationField

interface Props {
  location?: Location
  setLocation: Dispatch<SetStateAction<Location | undefined>>
  label?: string
  hideMap?: boolean
  backgroundLocations?: Location[]
  defaultCenter?: Location
}
