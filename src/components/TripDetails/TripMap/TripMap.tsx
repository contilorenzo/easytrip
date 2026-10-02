import React, { useEffect, useState, useMemo, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Modal, Alert, Platform, Dimensions } from 'react-native'
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps'
import Svg, { Path, Circle, Rect, Text as SvgText } from 'react-native-svg'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ExpoLocation from 'expo-location'
import { TripStep, Location, VEHICLES } from '../TripSteps/types'
import { format, eachDayOfInterval, interval } from 'date-fns'
import { useTripsContext } from '../../../state/TripsContext'
import { openDirections } from '../../../utils/navigation'

import LeafletMap, { LeafletMapRef } from './LeafletMap'
import MapCalloutOverlay, { MapCalloutOverlayRef } from './MapCalloutOverlay'
import AnimatedRoute from './AnimatedRoute'
import { geocodeQuery } from '../../../services/geocoding'
import { getCachedRoute, routeKey, setCachedRoute } from '../../../services/routeCache'
import { simplifyPath } from '../../../utils/simplifyPath'
import { MAPBOX_TOKEN } from '../../../utils/mapbox'

// Mappa Leaflet (Android) tenuta in parallelo ma disattivata: ora tutte le piattaforme usano react-native-maps.
// Metti a true per riattivarla su Android.
const USE_LEAFLET_MAP = false

// Centro e zoom della mappa per le destinazioni senza nessuna tappa con posizione (città o, in mancanza, paese)
type DestinationCenter = { latitude: number; longitude: number; delta: number }
const destinationCenterCache = new Map<string, DestinationCenter>()

// Ingrandimento del pin selezionato rispetto agli altri
const SELECTED_PIN_SCALE = 1.25

const DAY_COLORS = [
  '#FF6B6B', // Giorno 1: Corallo
  '#14B8A6', // Giorno 2: Turchese / Menta
  '#2563EB', // Giorno 3: Blu Reale (stacco netto e chiarissimo!)
  '#9333EA', // Giorno 4: Viola
  '#F59E0B', // Giorno 5: Arancio ambra
  '#EC4899', // Giorno 6: Rosa acceso
  '#0891B2', // Giorno 7: Ciano profondo
  '#4F46E5', // Giorno 8: Indaco
]

const OSM_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'

const TripMap = ({ steps, selectedStep, selectedDay, setSelectedDay, isSticky = false, onStepPress, onDeselectStep, onMapTouchChange }: Props) => {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = Dimensions.get('window')
  const defaultMapHeight = Platform.OS === 'android'
    ? Math.round(Math.min(315, Math.max(260, windowHeight * 0.35)))
    : Math.round(Math.min(265, Math.max(220, windowHeight * 0.31)))

  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('hybrid')

  // I marker custom (SVG) vengono "fotografati" dalla mappa: se la foto viene aggiornata di continuo
  // la mappa scatta mentre si anima. La riattivo solo per un attimo quando cambia qualcosa di visibile.
  const [tracksViewChanges, setTracksViewChanges] = useState(true)
  // Pin appena toccato: lo mostro subito come selezionato senza aspettare che la selezione torni dal padre
  const [pressedCoordKey, setPressedCoordKey] = useState<string | null>(null)
  const [routesByDay, setRoutesByDay] = useState<Record<string, { latitude: number; longitude: number }[]>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  const handleToggleMapType = () => {
    setMapType(prev => (prev === 'hybrid' ? 'standard' : 'hybrid'))
  }

  const mapRef = useRef<MapView>(null)
  const fullscreenMapRef = useRef<MapView>(null)
  useEffect(() => {
    setPressedCoordKey(null)
    setTracksViewChanges(true)
    const timer = setTimeout(() => setTracksViewChanges(false), 700)
    return () => clearTimeout(timer)
  }, [selectedDay, selectedStep, steps])

  const overlayRef = useRef<MapCalloutOverlayRef>(null)
  const fullscreenOverlayRef = useRef<MapCalloutOverlayRef>(null)
  // Il pin selezionato è più grande degli altri e cresce con un'animazione quando viene selezionato.
  // Il marker è un'immagine (non scala con transform), quindi la dimensione la anima lo stato, a pochi passi discreti.
  const [selectedScale, setSelectedScale] = useState(SELECTED_PIN_SCALE)
  const selectedPinKey =
    pressedCoordKey ??
    (selectedStep?.extraData?.location
      ? `${selectedStep.extraData.location.coordinates.lat}_${selectedStep.extraData.location.coordinates.lng}`
      : null)
  useEffect(() => {
    if (!selectedPinKey) return

    // Su Android ridisegnare l'immagine del pin mentre la camera si sposta fa traballare il marker: il pin selezionato
    // compare subito alla dimensione finale, senza animazione di crescita
    if (Platform.OS === 'android') {
      setSelectedScale(SELECTED_PIN_SCALE)
      setTracksViewChanges(true)
      return
    }

    const growth = new Animated.Value(0)
    let lastStep = -1
    const id = growth.addListener(({ value }) => {
      // Quantizzo: a ogni passo si ridisegna l'immagine dei marker
      const step = Math.round(value * 6)
      if (step === lastStep) return
      lastStep = step
      setSelectedScale(1 + (SELECTED_PIN_SCALE - 1) * (step / 6))
    })
    setSelectedScale(1)
    setTracksViewChanges(true)
    Animated.timing(growth, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
    return () => growth.removeListener(id)
  }, [selectedPinKey])

  const leafletMapRef = useRef<LeafletMapRef>(null)
  const fullscreenLeafletMapRef = useRef<LeafletMapRef>(null)

  const mapHeight = useRef(new Animated.Value(defaultMapHeight)).current
  const markerRefs = useRef<{ [key: string]: any }>({})
  const fullscreenMarkerRefs = useRef<{ [key: string]: any }>({})
  const isMapPressRef = useRef(false)
  const markerPressTimeRef = useRef(0)
  const currentRegionRef = useRef<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null)

  useEffect(() => {
    let subscription: ExpoLocation.LocationSubscription | null = null

    const initLocation = async () => {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync()
        if (status !== 'granted') return

        const lastKnown = await ExpoLocation.getLastKnownPositionAsync({})
        if (lastKnown?.coords) {
          setUserLocation({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          })
        }

        const current = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        })
        if (current?.coords) {
          setUserLocation({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          })
        }

        subscription = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.Balanced,
            distanceInterval: 10,
          },
          (loc) => {
            if (loc?.coords) {
              setUserLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              })
            }
          }
        )
      } catch (err) {
        console.warn('Errore inizializzazione posizione:', err)
      }
    }

    initLocation()

    return () => {
      subscription?.remove()
    }
  }, [])

  useEffect(() => {
    Animated.timing(mapHeight, {
      toValue: defaultMapHeight,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [isSticky, defaultMapHeight])

  // Anima la mappa sul pin con un livello di zoom bilanciato e un leggero offset a Nord,
  // così il callout è sempre visibile e non viene tagliato in alto.
  const animateToPoint = (lat: number, lng: number, fromMapPress: boolean, isModal: boolean) => {
    const targetMap = isModal ? fullscreenMapRef.current : mapRef.current
    // Se arrivo da un tap sul pin e l'utente è già più vicino del livello di zoom standard, non lo allontano
    const currentRegion = currentRegionRef.current
    const latDelta = fromMapPress && currentRegion ? Math.min(currentRegion.latitudeDelta, 0.026) : 0.026
    const lngDelta = fromMapPress && currentRegion ? Math.min(currentRegion.longitudeDelta, 0.026) : 0.026

    targetMap?.animateToRegion({
      latitude: lat + latDelta * 0.22,
      longitude: lng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    }, 500)
  }

  useEffect(() => {
    if (selectedStep && selectedStep.extraData?.location) {
      const coords = selectedStep.extraData.location.coordinates
      const lat = coords.lat
      const lng = coords.lng
      const coordKey = `${lat}_${lng}`

      const targetMarkerRefs = isFullscreen ? fullscreenMarkerRefs.current : markerRefs.current

      // Selezione avvenuta toccando direttamente il pin sulla mappa (e non dalla lista):
      // in quel caso l'animazione è già partita dal tap, qui mostro solo il callout
      const fromMapPress = selectedStep.source === 'map' || isMapPressRef.current
      isMapPressRef.current = false

      // Dopo il tap sul pin l'animazione è già partita dal tap
      if (fromMapPress) return

      if (USE_LEAFLET_MAP) {
        const targetRef = isFullscreen ? fullscreenLeafletMapRef : leafletMapRef
        targetRef.current?.animateToStep(lat, lng)
        return
      }

      animateToPoint(lat, lng, false, isFullscreen)
    }
  }, [selectedStep, isFullscreen])

  type MapPoint = Location & { vehicle?: VEHICLES, step?: TripStep<any> }

  // Group locations by day
  const groupedPoints = useMemo(() => {
    const groups: Record<string, MapPoint[]> = {}
    const sortedSteps = [...(steps || [])].sort(
      (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    )

    sortedSteps.forEach((step) => {
      const startDay = format(new Date(step.startDateTime), 'yyyy-MM-dd')
      const endDay = format(new Date(step.endDateTime), 'yyyy-MM-dd')

      const stepDays = eachDayOfInterval(interval(new Date(startDay), new Date(endDay))).map(
        (date) => format(date, 'yyyy-MM-dd')
      )

      stepDays.forEach((dayKey) => {
        if (!groups[dayKey]) groups[dayKey] = []
        if (step.extraData?.location) {
          groups[dayKey].push({ ...step.extraData.location, vehicle: step.extraData.arrivedBy, step })
        }
      })
    })
    return groups
  }, [steps])

  const days = useMemo(() => Object.keys(groupedPoints).sort(), [groupedPoints])

  // Mappa senza tappe con posizione: la centro sulla destinazione del viaggio, cercata con città e paese
  const destinationCity = useTripsContext().currentTrip?.city
  const destinationCountry = useTripsContext().currentTrip?.country
  const hasLocatedSteps = Object.values(groupedPoints).flat().length > 0
  const destinationKey = `${destinationCity ?? ''}|${destinationCountry?.title ?? ''}`
  const [destinationCenter, setDestinationCenter] = useState<DestinationCenter | null>(
    destinationCenterCache.get(destinationKey) ?? null
  )

  useEffect(() => {
    if (hasLocatedSteps || !destinationCity) return
    const cached = destinationCenterCache.get(destinationKey)
    if (cached) {
      setDestinationCenter(cached)
      return
    }

    let cancelled = false
    const countryCode = typeof destinationCountry?.id === 'string' ? destinationCountry.id : undefined
    ;(async () => {
      // Prima la città (zoom da città); se non si trova, il paese (zoom ampio)
      let found: DestinationCenter | null = null
      const city = await geocodeQuery(`${destinationCity}, ${destinationCountry?.title ?? ''}`, destinationCity, countryCode)
      if (city) {
        found = { latitude: city.coordinates.lat, longitude: city.coordinates.lng, delta: 0.12 }
      } else if (destinationCountry?.title) {
        const country = await geocodeQuery(destinationCountry.title, destinationCountry.title, countryCode)
        if (country) found = { latitude: country.coordinates.lat, longitude: country.coordinates.lng, delta: 6 }
      }
      if (!found || cancelled) return
      destinationCenterCache.set(destinationKey, found)
      setDestinationCenter(found)
    })()
    return () => {
      cancelled = true
    }
  }, [hasLocatedSteps, destinationKey])

  // Quando arriva il centro della destinazione sposto la mappa (già mostrata con una zona provvisoria)
  useEffect(() => {
    if (hasLocatedSteps || !destinationCenter) return
    const region = {
      latitude: destinationCenter.latitude,
      longitude: destinationCenter.longitude,
      latitudeDelta: destinationCenter.delta,
      longitudeDelta: destinationCenter.delta,
    }
    mapRef.current?.animateToRegion(region, 600)
    fullscreenMapRef.current?.animateToRegion(region, 600)
  }, [destinationCenter, hasLocatedSteps])

  const points = useMemo(() => {
    if (selectedDay === 'ALL') {
      return Object.values(groupedPoints).flat()
    }
    return groupedPoints[selectedDay] || []
  }, [selectedDay, groupedPoints])

  useEffect(() => {
    let cancelled = false

    // Percorso di un tratto tra due tappe consecutive: aereo e nave in linea retta, altrimenti strada con Mapbox
    // (a piedi o in auto; se l'auto non trova una strada riprovo a piedi). I risultati stradali vanno in cache.
    const fetchSegment = async (p1: MapPoint, p2: MapPoint): Promise<{ latitude: number; longitude: number }[]> => {
      if (p2.vehicle === VEHICLES.PLANE || p2.vehicle === VEHICLES.BOAT) {
        return [
          { latitude: p1.coordinates.lat, longitude: p1.coordinates.lng },
          { latitude: p2.coordinates.lat, longitude: p2.coordinates.lng },
        ]
      }

      const profile = p2.vehicle === VEHICLES.FEET ? 'walking' : 'driving'
      const key = routeKey(profile, p1.coordinates, p2.coordinates)
      const cached = await getCachedRoute(key)
      if (cached) return simplifyPath(cached)

      try {
        const accessToken = MAPBOX_TOKEN
        const request = async (mode: string) => {
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/${mode}/${p1.coordinates.lng},${p1.coordinates.lat};${p2.coordinates.lng},${p2.coordinates.lat}?geometries=geojson&overview=full&access_token=${accessToken}`
          )
          return response.json()
        }

        let data = await request(profile)
        // Se driving non trova una strada (es. centro storico, zona pedonale, parchi), tenta con walking
        if ((!data.routes || data.routes.length === 0) && profile === 'driving') {
          const altData = await request('walking')
          if (altData.routes && altData.routes.length > 0) data = altData
        }

        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((coord: any) => ({
            latitude: coord[1],
            longitude: coord[0],
          }))
          // Semplifico prima di salvare e disegnare: meno punti, stesso percorso
          const simplified = simplifyPath(coords)
          setCachedRoute(key, simplified)
          return simplified
        }
      } catch (e) {
        console.error('Errore recupero percorso:', e)
      }
      return []
    }

    // Tutti i giorni e tutti i tratti partono insieme (prima erano uno dopo l'altro); ogni giorno compare appena è pronto
    days.forEach(async (day) => {
      const dayPoints = groupedPoints[day]
      if (!dayPoints || dayPoints.length < 2) return

      const segments = await Promise.all(
        dayPoints.slice(0, -1).map((point, i) => fetchSegment(point, dayPoints[i + 1]))
      )
      if (cancelled) return
      setRoutesByDay((prev) => ({ ...prev, [day]: segments.flat() }))
    })

    return () => {
      cancelled = true
    }
  }, [groupedPoints, days])

  const getRegion = (targetDay: string = selectedDay) => {
    const targetPoints = targetDay === 'ALL'
      ? Object.values(groupedPoints).flat()
      : (groupedPoints[targetDay] || [])

    const effectivePoints = targetPoints.length > 0
      ? targetPoints
      : Object.values(groupedPoints).flat()

    if (effectivePoints.length === 0) {
      // Nessuna tappa con posizione: la mappa mostra la destinazione del viaggio (città o paese)
      if (destinationCenter) {
        return {
          latitude: destinationCenter.latitude,
          longitude: destinationCenter.longitude,
          latitudeDelta: destinationCenter.delta,
          longitudeDelta: destinationCenter.delta,
        }
      }
      return { latitude: 41.9, longitude: 12.5, latitudeDelta: 10, longitudeDelta: 10 }
    }

    const lats = effectivePoints.map((p) => p.coordinates.lat)
    const lngs = effectivePoints.map((p) => p.coordinates.lng)

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const rawLatDelta = maxLat - minLat
    const rawLngDelta = maxLng - minLng

    // Zoom equilibrato: né troppo lontano né troppo vicino
    const latDelta = Math.max(rawLatDelta * 1.38, 0.024)
    const lngDelta = Math.max(rawLngDelta * 1.38, 0.024)

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    }
  }

  const isFirstDayMount = useRef(true)

  useEffect(() => {
    if (isFirstDayMount.current) {
      isFirstDayMount.current = false
      return
    }

    const nextRegion = getRegion(selectedDay)
    // Zoom progressivo e fluido sia per la mappa standard che fullscreen
    mapRef.current?.animateToRegion(nextRegion, 800)
    fullscreenMapRef.current?.animateToRegion(nextRegion, 800)
  }, [selectedDay])

  const tripsContext = useTripsContext()
  const tripStartDate = new Date(tripsContext.currentTrip?.startDate || new Date()).setHours(0,0,0,0)

  const getDayColor = (day: string) => {
    const currentDayDate = new Date(day).setHours(0,0,0,0)
    const diff = Math.round((currentDayDate - tripStartDate) / 86400000)
    return DAY_COLORS[Math.max(0, diff) % DAY_COLORS.length]
  }

  // Dati del fumetto del pin selezionato (disegnato da MapCalloutOverlay)
  const calloutTarget = (() => {
    const loc = selectedStep?.extraData?.location
    if (!loc?.name) return null
    let title = loc.name as string
    if (selectedDay !== 'ALL') {
      const numbers: number[] = []
      ;(groupedPoints[selectedDay] || []).forEach((p, i) => {
        if (p.coordinates.lat === loc.coordinates.lat && p.coordinates.lng === loc.coordinates.lng) numbers.push(i + 1)
      })
      if (numbers.length === 0) return null
      title = `${numbers.join('•')}. ${title}`
    }
    return { lat: loc.coordinates.lat, lng: loc.coordinates.lng, title, address: loc.address as string | undefined }
  })()

  const dayOptions = useMemo(() => ['ALL', ...days], [days])
  const selectedDayIndex = dayOptions.indexOf(selectedDay)
  
  const handlePrevDay = () => {
    if (selectedDayIndex > 0) setSelectedDay(dayOptions[selectedDayIndex - 1])
  }
  
  const handleNextDay = () => {
    if (selectedDayIndex < dayOptions.length - 1) setSelectedDay(dayOptions[selectedDayIndex + 1])
  }
  
  const isAll = selectedDay === 'ALL'
  const currentDayColor = isAll ? 'tomato' : getDayColor(selectedDay)
  
  const getDayLabel = () => {
    if (isAll) return 'Tutti i giorni'
    const diffDays = Math.round((new Date(selectedDay).setHours(0,0,0,0) - tripStartDate) / 86400000)
    return `Giorno ${Math.max(0, diffDays) + 1}`
  }
  const currentDayLabel = getDayLabel()

  const handleCenterOnUser = async (targetMapRef: React.RefObject<MapView | null>) => {
    try {
      let locCoords = userLocation
      if (!locCoords) {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert(
            'Permesso Posizione Richiesto',
            'Per visualizzare e centrare la mappa sulla tua posizione attuale, abilita i permessi di localizzazione nelle impostazioni.'
          )
          return
        }

        const loc = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        })

        if (loc?.coords) {
          locCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }
          setUserLocation(locCoords)
        }
      }

      if (locCoords) {
        if (USE_LEAFLET_MAP) {
          const targetRef = targetMapRef === fullscreenMapRef ? fullscreenLeafletMapRef : leafletMapRef
          targetRef.current?.centerOnUser(locCoords)
          return
        }

        targetMapRef.current?.animateToRegion({
          latitude: locCoords.latitude,
          longitude: locCoords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 500)
      }
    } catch (err) {
      console.warn('Errore rilevamento posizione:', err)
      Alert.alert('Posizione', 'Impossibile rilevare la posizione attuale.')
    }
  }

  const handleOpenFullscreen = () => {
    setIsFullscreen(true)
    setTimeout(() => {
      if (currentRegionRef.current) {
        fullscreenMapRef.current?.animateToRegion(currentRegionRef.current, 250)
      } else if (selectedStep?.extraData?.location) {
        const coords = selectedStep.extraData.location.coordinates
        const latDelta = 0.026
        const lngDelta = 0.026
        fullscreenMapRef.current?.animateToRegion({
          latitude: coords.lat + latDelta * 0.22,
          longitude: coords.lng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }, 250)
      } else {
        fullscreenMapRef.current?.animateToRegion(getRegion(), 250)
      }
    }, 150)
  }

  const renderMarkersAndRoutes = (isModal: boolean) => {
    const targetMarkerRefs = isModal ? fullscreenMarkerRefs : markerRefs
    const isSpecificDay = selectedDay !== 'ALL'

    const markers = days.filter(d => selectedDay === 'ALL' || selectedDay === d).map((day) => {
      const dayPoints = groupedPoints[day] || []
      const dayRoute = routesByDay[day] || []
      const color = getDayColor(day)
      const offset = days.indexOf(day) * 0.00012
      
      const coordMap = new Map<string, { point: MapPoint; stepNumbers: number[]; isSelected: boolean }>()

      dayPoints.forEach((point, index) => {
        const coordKey = `${point.coordinates.lat}_${point.coordinates.lng}`
        const isPointSelected = pressedCoordKey
          ? pressedCoordKey === coordKey
          : !!(
              selectedStep?.extraData?.location &&
              selectedStep.extraData.location.coordinates.lat === point.coordinates.lat &&
              selectedStep.extraData.location.coordinates.lng === point.coordinates.lng
            )
        const stepNum = index + 1

        if (coordMap.has(coordKey)) {
          const entry = coordMap.get(coordKey)!
          entry.stepNumbers.push(stepNum)
          if (isPointSelected) entry.isSelected = true
        } else {
          coordMap.set(coordKey, {
            point,
            stepNumbers: [stepNum],
            isSelected: isPointSelected,
          })
        }
      })

      const uniqueDayPoints = Array.from(coordMap.entries())

      return (
        // La key include il giorno selezionato: al cambio giorno i marker e le rotte vengono rimontati,
        // altrimenti su Android react-native-maps lascia pin con i vecchi numeri e polilinee del giorno precedente
        <React.Fragment key={`${isModal ? 'modal_' : ''}group_${day}_${selectedDay}`}>
          {uniqueDayPoints.map(([coordKey, { point, stepNumbers, isSelected }]) => {
            const stepNumberText = isSpecificDay ? stepNumbers.join('•') : ''
            const isMulti = stepNumbers.length > 1
            const width = stepNumbers.length > 2 ? 44 : isMulti ? 36 : 28
            const height = 36
            // L'area toccabile del marker coincide con la sua immagine: ritaglio il margine vuoto attorno al pin
            // (3 px per lato e il fondo sotto la punta) così i pin vicini non si sovrappongono inutilmente
            const cropX = 3
            const visibleWidth = width - cropX * 2
            const visibleHeight = 31
            const cx = width / 2
            const leftX = 14
            const rightX = width - 14

            const contentColor = color

            const pathD = `M${leftX} 2 L${rightX} 2 A 9.5 9.5 0 0 1 ${rightX + 9.5} 11.5 C ${rightX + 9.5} 17 ${cx + 5} 24 ${cx} 29.5 C ${cx - 5} 24 ${leftX - 9.5} 17 ${leftX - 9.5} 11.5 A 9.5 9.5 0 0 1 ${leftX} 2 Z`

            const sel = isSelected
            const pinScale = sel ? selectedScale : 1
            const pinBgColor = sel ? '#FFFFFF' : color
            const pinBorderColor = sel ? color : '#FFFFFF'
            const strokeWidth = sel ? 2 : 1.5

            return (
              <Marker
                ref={(ref) => {
                  if (ref) {
                    targetMarkerRefs.current[coordKey] = ref
                  }
                }}
                // La key include lo stato selezionato: su Android il pin cambia aspetto solo se il marker viene ricreato
                key={`${isModal ? 'modal_' : ''}${day}_${coordKey}_${stepNumberText}_${sel ? 'sel' : 'base'}`}
                coordinate={{
                  latitude: point.coordinates.lat,
                  longitude: point.coordinates.lng,
                }}
                tracksViewChanges={tracksViewChanges}
                zIndex={sel ? 1000 : 10 + (stepNumbers[0] || 0)}
                anchor={{ x: 0.5, y: 29.5 / visibleHeight }}
                onPress={() => {
                  markerPressTimeRef.current = Date.now()
                  isMapPressRef.current = true
                  setPressedCoordKey(coordKey)
                  setTracksViewChanges(true)
                  // Con moveOnMarkerPress={false} Google non sposta la camera: la muovo io, come per la lista
                  if (!USE_LEAFLET_MAP) {
                    animateToPoint(point.coordinates.lat, point.coordinates.lng, true, isModal)
                  }
                  if (point.step && onStepPress) {
                    onStepPress(point.step, day)
                  }
                }}
              >
                <View style={[styles.svgMarkerContainer, { width: visibleWidth * pinScale, height: visibleHeight * pinScale }]}>
                  <Svg width={visibleWidth * pinScale} height={visibleHeight * pinScale} viewBox={`${cropX} 0 ${visibleWidth} ${visibleHeight}`}>
                    <Path
                      d={pathD}
                      fill={pinBgColor}
                      stroke={pinBorderColor}
                      strokeWidth={strokeWidth}
                    />
                    {isSpecificDay ? (
                      <>
                        {!sel && (
                          <Rect
                            x={leftX - 7}
                            y={4.5}
                            width={rightX - leftX + 14}
                            height={14}
                            rx={7}
                            ry={7}
                            fill="#FFFFFF"
                          />
                        )}
                        <SvgText
                          x={cx}
                          y={15.2}
                          fontSize={isMulti ? 10 : 10.5}
                          fontWeight={sel ? '900' : '800'}
                          textAnchor="middle"
                          fill={contentColor}
                        >
                          {stepNumberText}
                        </SvgText>
                      </>
                    ) : (
                      <Circle
                        cx={cx}
                        cy={11.5}
                        r={2.8}
                        fill={sel ? contentColor : '#FFFFFF'}
                      />
                    )}
                  </Svg>
                </View>
              </Marker>
            )
          })}
        

          {dayRoute.length > 0 && (
            // Tutti i giorni visibili si disegnano insieme (su Android senza animazione)
            <AnimatedRoute
              key={`route_${day}_${selectedDay}_${dayRoute.length}`}
              coordinates={dayRoute}
              color={color}
              offset={offset}
            />
          )}
        </React.Fragment>
      )
    })

    return markers
  }

  return (
    <View style={styles.container}>
      <View style={[styles.mapCard, { backgroundColor: mapType === 'standard' ? '#e5e3df' : '#18181B' }]}>
        <Animated.View
          style={[styles.mapWrapper, { height: mapHeight, backgroundColor: mapType === 'standard' ? '#e5e3df' : '#18181B' }]}
          onTouchStart={() => onMapTouchChange?.(true)}
          onTouchEnd={() => onMapTouchChange?.(false)}
          onTouchCancel={() => onMapTouchChange?.(false)}
        >
        {USE_LEAFLET_MAP ? (
          <LeafletMap
            ref={leafletMapRef}
            steps={steps}
            groupedPoints={groupedPoints}
            routesByDay={routesByDay}
            selectedDay={selectedDay}
            selectedStep={selectedStep}
            userLocation={userLocation}
            getDayColor={getDayColor}
            days={days}
            onStepPress={onStepPress}
            onDeselectStep={onDeselectStep}
            onMapTouchChange={onMapTouchChange}
            mapType={mapType}
            style={styles.map}
          />
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            mapType={mapType}
            initialRegion={getRegion()}
            moveOnMarkerPress={false}
            scrollEnabled={true}
            zoomEnabled={true}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onPress={() => {
              if (Date.now() - markerPressTimeRef.current < 400) {
                return
              }
              if (onDeselectStep) {
                onDeselectStep()
              }
            }}
            onPanDrag={() => overlayRef.current?.beginMove()}
            onRegionChange={(r) => overlayRef.current?.setRegion(r, false)}
            onRegionChangeComplete={(r) => {
              currentRegionRef.current = r
              overlayRef.current?.setRegion(r, true)
            }}
            onUserLocationChange={(e) => {
              if (e.nativeEvent?.coordinate) {
                setUserLocation({
                  latitude: e.nativeEvent.coordinate.latitude,
                  longitude: e.nativeEvent.coordinate.longitude,
                })
              }
            }}
          >
            {renderMarkersAndRoutes(false)}
          </MapView>
        )}

        {!USE_LEAFLET_MAP && (
          <MapCalloutOverlay
            ref={overlayRef}
            initialRegion={getRegion()}
            target={calloutTarget}
            onClose={onDeselectStep}
            onDirections={() => openDirections(selectedStep.extraData.location)}
          />
        )}

        {/* Floating action buttons in top-right corner of map */}
        <View style={styles.floatingControlsContainer}>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleOpenFullscreen}
            activeOpacity={0.8}
          >
            <Ionicons name="expand-outline" size={16} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleToggleMapType}
            activeOpacity={0.8}
          >
            <Ionicons
              name={mapType === 'hybrid' ? 'map-outline' : 'earth'}
              size={16}
              color={mapType === 'hybrid' ? '#0284C7' : '#333'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => handleCenterOnUser(mapRef)}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={16} color={userLocation ? '#007AFF' : '#666'} />
          </TouchableOpacity>
        </View>

        {USE_LEAFLET_MAP && selectedStep?.extraData?.location && (
          <TouchableOpacity
            style={styles.directionsButton}
            onPress={() => openDirections(selectedStep.extraData.location)}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={13} color="white" />
            <Text style={styles.directionsButtonText}>Indicazioni</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
      </View>

      {/* Fullscreen Map Modal */}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          {USE_LEAFLET_MAP ? (
            <LeafletMap
              ref={fullscreenLeafletMapRef}
              steps={steps}
              groupedPoints={groupedPoints}
              routesByDay={routesByDay}
              selectedDay={selectedDay}
              selectedStep={selectedStep}
              userLocation={userLocation}
              getDayColor={getDayColor}
              days={days}
              onStepPress={onStepPress}
              onDeselectStep={onDeselectStep}
              mapType={mapType}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <MapView
              ref={fullscreenMapRef}
              style={StyleSheet.absoluteFill}
              mapType={mapType}
              initialRegion={getRegion()}
              moveOnMarkerPress={false}
              scrollEnabled={true}
              zoomEnabled={true}
              showsUserLocation={true}
              showsMyLocationButton={false}
              onPress={() => {
                if (Date.now() - markerPressTimeRef.current < 400) {
                  return
                }
                if (onDeselectStep) {
                  onDeselectStep()
                }
              }}
              onPanDrag={() => fullscreenOverlayRef.current?.beginMove()}
              onRegionChange={(r) => fullscreenOverlayRef.current?.setRegion(r, false)}
              onRegionChangeComplete={(r) => {
                currentRegionRef.current = r
                fullscreenOverlayRef.current?.setRegion(r, true)
              }}
              onUserLocationChange={(e) => {
                if (e.nativeEvent?.coordinate) {
                  setUserLocation({
                    latitude: e.nativeEvent.coordinate.latitude,
                    longitude: e.nativeEvent.coordinate.longitude,
                  })
                }
              }}
            >
              {renderMarkersAndRoutes(true)}
            </MapView>
          )}

          {!USE_LEAFLET_MAP && (
            <MapCalloutOverlay
              ref={fullscreenOverlayRef}
              initialRegion={getRegion()}
              target={calloutTarget}
              onClose={onDeselectStep}
              onDirections={() => openDirections(selectedStep.extraData.location)}
            />
          )}

          {/* Floating top controls: Back button (chevron-back), Day Selector, Layer toggle, and Location */}
          <View
            style={[
              styles.fullscreenTopContainer,
              { paddingTop: Math.max(insets.top, 16) + 6 },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.fullscreenTopBar} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => setIsFullscreen(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={17} color="#000" />
              </TouchableOpacity>

              <View style={styles.fullscreenSelectorPill}>
                <TouchableOpacity onPress={handlePrevDay} disabled={selectedDayIndex === 0} style={styles.arrowButton}>
                  <Ionicons name="chevron-back" size={20} color={selectedDayIndex === 0 ? '#bbb' : '#333'} />
                </TouchableOpacity>

                <View style={styles.selectorLabel}>
                  {selectedDay !== 'ALL' && (
                    <View style={[styles.colorDot, { backgroundColor: currentDayColor }]} />
                  )}
                  <Text style={styles.selectorText}>
                    {currentDayLabel}
                  </Text>
                </View>

                <TouchableOpacity onPress={handleNextDay} disabled={selectedDayIndex === dayOptions.length - 1} style={styles.arrowButton}>
                  <Ionicons name="chevron-forward" size={20} color={selectedDayIndex === dayOptions.length - 1 ? '#bbb' : '#333'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.floatingButton}
                onPress={handleToggleMapType}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={mapType === 'hybrid' ? 'map-outline' : 'earth'}
                  size={16}
                  color={mapType === 'hybrid' ? '#0284C7' : '#333'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => handleCenterOnUser(fullscreenMapRef)}
                activeOpacity={0.8}
              >
                <Ionicons name="locate" size={16} color={userLocation ? '#007AFF' : '#666'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Floating directions button at bottom if step selected */}
          {USE_LEAFLET_MAP && selectedStep?.extraData?.location && (
            <View
              style={[
                styles.fullscreenDirectionsWrapper,
                { bottom: Math.max(insets.bottom, 16) + 12 },
              ]}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                style={styles.fullscreenDirectionsButton}
                onPress={() => openDirections(selectedStep.extraData.location)}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={13} color="white" />
                <Text style={styles.directionsButtonText}>Indicazioni</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 0,
    paddingHorizontal: 0,
  },
  mapCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e5e3df',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  mapWrapper: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e5e3df',
  },
  selectorLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.2,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  floatingControlsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column',
    gap: 6,
    zIndex: 100,
  },
  floatingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  directionsButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'tomato',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 16,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 100,
  },
  directionsButtonText: {
    color: 'white',
    fontSize: 11.5,
    fontWeight: '700',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullscreenTopContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  fullscreenDirectionsWrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  fullscreenDirectionsButton: {
    backgroundColor: 'tomato',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  fullscreenSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  svgMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
})

interface Props {
  steps: TripStep<any>[]
  selectedStep?: any
  selectedDay: string
  setSelectedDay: (day: string) => void
  isSticky?: boolean
  onStepPress?: (step: any, day?: string) => void
  onDeselectStep?: () => void
  onMapTouchChange?: (isTouching: boolean) => void
}

export default TripMap
