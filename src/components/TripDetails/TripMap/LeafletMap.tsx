import React, { useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react'
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native'
import { WebView } from 'react-native-webview'
import { TripStep } from '../TripSteps/types'
import { LEAFLET_CSS, LEAFLET_JS } from './leafletAssets'

export interface LeafletMapRef {
  centerOnUser: (coords?: { latitude: number; longitude: number }) => void
  animateToStep: (lat: number, lng: number) => void
}

interface Props {
  steps: TripStep<any>[]
  groupedPoints: Record<string, any[]>
  routesByDay: Record<string, { latitude: number; longitude: number }[]>
  selectedDay: string
  selectedStep: TripStep<any> | null
  userLocation: { latitude: number; longitude: number } | null
  getDayColor: (day: string) => string
  days: string[]
  onStepPress?: (step: TripStep<any>, day: string) => void
  onDeselectStep?: () => void
  onMapTouchChange?: (isTouching: boolean) => void
  // Modalità selezione: nessun filtro sui POI, tap sulla mappa = scelta di un punto
  pickMode?: boolean
  onPickLocation?: (lat: number, lng: number) => void
  pickMarkers?: { lat: number; lng: number; color: string }[]
  mapType?: 'standard' | 'hybrid'
  style?: StyleProp<ViewStyle>
}

export const LeafletMap = forwardRef<LeafletMapRef, Props>(({
  steps,
  groupedPoints,
  routesByDay,
  selectedDay,
  selectedStep,
  userLocation,
  getDayColor,
  days,
  onStepPress,
  onDeselectStep,
  onMapTouchChange,
  pickMode = false,
  onPickLocation,
  pickMarkers,
  mapType = 'hybrid',
  style,
}, ref) => {
  const webViewRef = useRef<WebView>(null)
  const isLoadedRef = useRef(false)

  // Chiave stabile: il chiamante può passare un nuovo array a ogni render
  const pickMarkersKey = JSON.stringify(pickMarkers || [])

  // Prepara i dati serializzabili per la mappa
  const mapData = useMemo(() => {
    const isSpecificDay = selectedDay !== 'ALL'
    const activeDays = days.filter((d) => selectedDay === 'ALL' || selectedDay === d)
    const pointsList: any[] = []

    activeDays.forEach((day) => {
      const dayPoints = groupedPoints[day] || []
      const color = getDayColor(day)
      
      const coordMap = new Map<string, { point: any; stepNumbers: number[]; isSelected: boolean }>()

      dayPoints.forEach((point, index) => {
        const coordKey = `${point.coordinates.lat}_${point.coordinates.lng}`
        const isPointSelected = !!(
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

      coordMap.forEach(({ point, stepNumbers, isSelected }, coordKey) => {
        const stepNumberText = isSpecificDay ? stepNumbers.join('•') : ''
        pointsList.push({
          lat: point.coordinates.lat,
          lng: point.coordinates.lng,
          name: point.name || '',
          address: point.address || '',
          color,
          day,
          stepNumberText,
          stepId: point.step ? `${point.step.title}_${point.step.startDateTime}` : `${day}_${coordKey}`,
          isSelected,
        })
      })
    })

    const routesList: any[] = []
    activeDays.forEach((day, dayIndex) => {
      const dayRoute = routesByDay[day] || []
      const color = getDayColor(day)
      const offset = dayIndex * 0.00012

      if (dayRoute.length > 0) {
        routesList.push({
          coords: dayRoute.map((c) => [c.latitude + offset, c.longitude + offset]),
          color,
          isDashed: false,
        })
      }
    })

    return {
      selectedDay,
      mapType: mapType || 'hybrid',
      points: pointsList,
      routes: routesList,
      userLocation,
      pickMode,
      pickMarkers: JSON.parse(pickMarkersKey),
      selectedCoord: selectedStep?.extraData?.location?.coordinates
        ? {
            lat: selectedStep.extraData.location.coordinates.lat,
            lng: selectedStep.extraData.location.coordinates.lng,
          }
        : null,
    }
  }, [days, selectedDay, groupedPoints, routesByDay, selectedStep, userLocation, mapType, pickMode, pickMarkersKey])

  const latestMapDataRef = useRef(mapData)
  latestMapDataRef.current = mapData

  const sendMapUpdate = (data: any, forceFit = false) => {
    webViewRef.current?.injectJavaScript(`
      if (window.updateMapData) {
        window.updateMapData(${JSON.stringify(data)}, ${forceFit});
      }
      true;
    `)
  }

  useImperativeHandle(ref, () => ({
    centerOnUser: (coords?: { latitude: number; longitude: number }) => {
      const loc = coords || userLocation
      if (loc) {
        webViewRef.current?.injectJavaScript(`
          if (window.centerOnUser) {
            window.centerOnUser(${loc.latitude}, ${loc.longitude});
          }
          true;
        `)
      }
    },
    animateToStep: (lat: number, lng: number) => {
      webViewRef.current?.injectJavaScript(`
        if (window.panToCoords) {
          window.panToCoords(${lat}, ${lng});
        }
        true;
      `)
    },
  }))

  // Aggiorna la mappa via JavaScript senza ricaricare la pagina
  useEffect(() => {
    if (isLoadedRef.current) {
      sendMapUpdate(mapData)
    }
  }, [mapData])

  const initialHtml = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>${LEAFLET_CSS}</style>
  <script>${LEAFLET_JS}</script>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #18181B;
      overflow: hidden;
      touch-action: none;
      -webkit-touch-callout: none;
      user-select: none;
      -webkit-user-select: none;
      border-radius: 20px;
    }
    .leaflet-tile {
      image-rendering: -webkit-optimize-contrast;
    }
    .custom-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible !important;
    }
    .custom-pin svg {
      overflow: visible;
    }
    .user-pulse {
      width: 12px;
      height: 12px;
      background: #007AFF;
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(0,122,255,0.25);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      padding: 2px;
    }
    .leaflet-popup-content {
      margin: 10px 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #222;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var initialData = ${JSON.stringify(mapData)};

    var initialCenter = [41.9, 12.5];
    var initialZoom = 6;
    if (initialData && initialData.points && initialData.points.length > 0) {
      var sumLat = 0;
      var sumLng = 0;
      initialData.points.forEach(function(p) {
        sumLat += p.lat;
        sumLng += p.lng;
      });
      initialCenter = [sumLat / initialData.points.length, sumLng / initialData.points.length];
      initialZoom = initialData.points.length === 1 ? 14 : 12;
    }

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      touchZoom: true,
      dragging: true,
      tap: false,
      bounceAtZoomLimits: false
    }).setView(initialCenter, initialZoom);

    map.createPane('routesPane');
    map.getPane('routesPane').style.zIndex = 350;

    map.createPane('labelsPane');
    map.getPane('labelsPane').style.zIndex = 450;
    map.getPane('labelsPane').style.pointerEvents = 'none';

    var currentTileLayer = null;
    var currentLabelsLayer = null;
    var currentMapType = null;

    // Sotto questo zoom le scritte sono a metà dimensione (tile 128px da z+1), da qui in su standard (256px)
    var LABEL_FULL_ZOOM = 13;
    // Mappa del viaggio: nasconde nomi delle strade (3), POI (2) e trasporti (4), perché le tappe sono già salvate.
    // Modalità selezione (pickMode): nessun filtro, così tutti i POI sono visibili e selezionabili.
    var PICK_MODE = !!(initialData && initialData.pickMode);
    var LABEL_STYLE = PICK_MODE ? '' : '&apistyle=s.t%3A3%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A2%7Cp.v%3Aoff%2Cs.t%3A4%7Cp.v%3Aoff';
    var SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3'];
    var currentSatLayer = null;
    var currentLabelsSmall = null;

    function labelTileOptions(small, extra) {
      var o = {
        maxZoom: 20,
        minZoom: 1,
        subdomains: SUBDOMAINS,
        tileSize: small ? 128 : 256,
        zoomOffset: small ? 1 : 0,
        attribution: ''
      };
      for (var k in extra) o[k] = extra[k];
      return o;
    }

    function updateTileLayer(type) {
      var isHybrid = type === 'hybrid';
      var small = !PICK_MODE && map.getZoom() < LABEL_FULL_ZOOM;
      if (currentMapType === type && currentLabelsSmall === small && currentTileLayer) return;

      var typeChanged = currentMapType !== type;
      currentMapType = type;
      currentLabelsSmall = small;
      // scale=1 con tile 128px (2x di densità sui display retina), scale=2 con tile 256px
      var scale = small ? 1 : 2;
      var suffix = '&x={x}&y={y}&z={z}&scale=' + scale + '&hl=it' + LABEL_STYLE;

      if (currentLabelsLayer) {
        map.removeLayer(currentLabelsLayer);
        currentLabelsLayer = null;
      }

      if (isHybrid) {
        // 1. Fotografia satellitare alla base (senza scritte) sotto alle rotte; non dipende dallo zoom delle scritte
        if (typeChanged || !currentSatLayer) {
          if (currentTileLayer) map.removeLayer(currentTileLayer);
          currentSatLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&scale=2', {
            maxZoom: 20,
            minZoom: 1,
            subdomains: SUBDOMAINS,
            tileSize: 512,
            zoomOffset: -1,
            attribution: ''
          }).addTo(map);
          currentTileLayer = currentSatLayer;
        }
        // 2. Scritte e nomi delle strade trasparenti
        currentLabelsLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=h' + suffix, labelTileOptions(small, { pane: 'labelsPane' })).addTo(map);
      } else {
        // Mappa stradale classica (le scritte sono nel tile di base)
        if (currentTileLayer) map.removeLayer(currentTileLayer);
        currentSatLayer = null;
        currentTileLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m' + suffix, labelTileOptions(small, {})).addTo(map);
      }

      currentTileLayer.bringToBack();

      var mapEl = document.getElementById('map');
      if (mapEl) {
        mapEl.style.background = isHybrid ? '#18181B' : '#e5e3df';
      }
    }

    map.on('zoomend', function() {
      if (currentMapType) updateTileLayer(currentMapType);
    });

    var markersLayer = L.layerGroup().addTo(map);
    var routesLayer = L.layerGroup().addTo(map);
    var userLayer = L.layerGroup().addTo(map);
    var pickLayer = L.layerGroup().addTo(map);
    var pickMarkerList = [];
    var lastPickKeys = null;
    var lastTapKey = null;
    var markersMap = {};
    var userMarker = null;
    var lastMarkerClickTime = 0;
    var isProgrammaticPopupChange = false;
    var hasInitialFit = false;
    var currentDayInMap = null;
    var userHasInteracted = false;

    function getTeardropPath(width) {
      var leftX = 14;
      var rightX = width - 14;
      var cx = width / 2;
      return 'M' + leftX + ' 2 ' +
        'L' + rightX + ' 2 ' +
        'A 9.5 9.5 0 0 1 ' + (rightX + 9.5) + ' 11.5 ' +
        'C ' + (rightX + 9.5) + ' 17 ' + (cx + 5) + ' 24 ' + cx + ' 29.5 ' +
        'C ' + (cx - 5) + ' 24 ' + (leftX - 9.5) + ' 17 ' + (leftX - 9.5) + ' 11.5 ' +
        'A 9.5 9.5 0 0 1 ' + leftX + ' 2 Z';
    }

    function createPin(color, isSelected, stepNumberText) {
      var pinColor = isSelected ? '#FFFFFF' : color;
      var strokeColor = isSelected ? color : '#FFFFFF';
      var strokeWidth = isSelected ? '2' : '1.5';
      var contentColor = color;

      var text = stepNumberText || '';
      var hasDot = text.indexOf('•') !== -1;
      var dotCount = (text.match(/•/g) || []).length;
      var width = dotCount > 1 ? 44 : (hasDot ? 36 : 28);
      var height = 36;
      var cx = width / 2;
      var leftX = 14;
      var rightX = width - 14;

      var innerContent = '';
      if (text) {
        var fontSize = hasDot ? 10 : 10.5;
        if (!isSelected) {
          innerContent = '<rect x="' + (leftX - 7) + '" y="4.5" width="' + (rightX - leftX + 14) + '" height="14" rx="7" ry="7" fill="#FFFFFF"/>' +
            '<text x="' + cx + '" y="15.2" font-size="' + fontSize + '" font-weight="800" font-family="-apple-system, BlinkMacSystemFont, Roboto, sans-serif" text-anchor="middle" fill="' + contentColor + '">' + text + '</text>';
        } else {
          innerContent = '<text x="' + cx + '" y="15.2" font-size="' + fontSize + '" font-weight="900" font-family="-apple-system, BlinkMacSystemFont, Roboto, sans-serif" text-anchor="middle" fill="' + contentColor + '">' + text + '</text>';
        }
      } else {
        var dotColor = isSelected ? contentColor : '#FFFFFF';
        innerContent = '<circle cx="' + cx + '" cy="' + 11.5 + '" r="2.8" fill="' + dotColor + '"/>';
      }

      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">' +
        '<defs>' +
        '  <filter id="s" x="-20%" y="-10%" width="140%" height="130%">' +
        '    <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity="0.32"/>' +
        '  </filter>' +
        '</defs>' +
        '<path d="' + getTeardropPath(width) + '" fill="' + pinColor + '" stroke="' + strokeColor + '" stroke-width="' + strokeWidth + '" filter="url(#s)"/>' +
        innerContent +
        '</svg>';

      return L.divIcon({
        className: 'custom-pin',
        html: svg,
        iconSize: [width, height],
        iconAnchor: [cx, 29.5],
        popupAnchor: [0, -30]
      });
    }

    var userIcon = L.divIcon({
      className: 'custom-pin',
      html: '<div class="user-pulse"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    window.addEventListener('resize', function() {
      map.invalidateSize();
    });

    map.on('popupclose', function(e) {
      if (PICK_MODE) return;
      if (isProgrammaticPopupChange) return;
      if (Date.now() - lastMarkerClickTime < 300) return;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress' }));
      }
    });

    map.on('click', function(e) {
      if (PICK_MODE) {
        lastTapKey = e.latlng.lat + ',' + e.latlng.lng;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng }));
        }
        return;
      }
      if (Date.now() - lastMarkerClickTime < 300) {
        return;
      }
      map.closePopup();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress' }));
      }
    });

    window.addEventListener('touchstart', function() {
      userHasInteracted = true;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'touchStart' }));
      }
    }, { passive: true });

    window.addEventListener('touchend', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'touchEnd' }));
      }
    }, { passive: true });

    window.addEventListener('touchcancel', function() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'touchEnd' }));
      }
    }, { passive: true });

    window.centerOnUser = function(lat, lng) {
      userHasInteracted = true;
      map.flyTo([lat, lng], 15, { duration: 0.8 });
    };

    window.panToCoords = function(lat, lng) {
      userHasInteracted = true;
      map.flyTo([lat, lng], 14, { duration: 0.7 });
    };

    window.updateMapData = function(data, forceFit) {
      if (!data) return;

      // Aggiorna le rotte con contorno bianco raffinato per massimo contrasto
      routesLayer.clearLayers();
      if (data.routes && data.routes.length > 0) {
        data.routes.forEach(function(r) {
          if (r.coords && r.coords.length > 1) {
            // Contorno bianco raffinato
            L.polyline(r.coords, {
              color: '#FFFFFF',
              weight: 5.5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
              pane: 'routesPane'
            }).addTo(routesLayer);

            // Linea colorata della rotta sopra
            L.polyline(r.coords, {
              color: r.color,
              weight: 3.8,
              opacity: 1.0,
              dashArray: r.isDashed ? '6, 8' : undefined,
              lineCap: 'round',
              lineJoin: 'round',
              pane: 'routesPane'
            }).addTo(routesLayer);
          }
        });
      }

      // Aggiorna i marker esistenti o aggiungi i nuovi SENZA distruggere quelli aperti
      var activeStepIds = {};
      var bounds = [];

      if (data.points && data.points.length > 0) {
        data.points.forEach(function(p) {
          activeStepIds[p.stepId] = true;
          bounds.push([p.lat, p.lng]);

          var existingMarker = markersMap[p.stepId];
          var badgeHtml = p.stepNumberText 
            ? '<span style="display:inline-block;background:' + p.color + ';color:#fff;border-radius:10px;padding:1px 6px;font-size:11px;font-weight:700;margin-right:6px;">' + p.stepNumberText + '</span>'
            : '';

          if (existingMarker) {
            existingMarker.setLatLng([p.lat, p.lng]);
            existingMarker.setIcon(createPin(p.color, p.isSelected, p.stepNumberText));
            existingMarker.setZIndexOffset(p.isSelected ? 1000 : 10);
            if (p.name) {
              existingMarker.setPopupContent('<b>' + badgeHtml + p.name + '</b>' + (p.address ? '<br/><span style="color:#666;font-size:11px;">' + p.address + '</span>' : ''));
            }
            if (p.isSelected && !existingMarker.isPopupOpen()) {
              isProgrammaticPopupChange = true;
              existingMarker.openPopup();
              isProgrammaticPopupChange = false;
            } else if (!p.isSelected && existingMarker.isPopupOpen()) {
              isProgrammaticPopupChange = true;
              existingMarker.closePopup();
              isProgrammaticPopupChange = false;
            }
          } else {
            var marker = L.marker([p.lat, p.lng], {
              icon: createPin(p.color, p.isSelected, p.stepNumberText),
              zIndexOffset: p.isSelected ? 1000 : 10
            });

            if (p.name) {
              marker.bindPopup('<b>' + badgeHtml + p.name + '</b>' + (p.address ? '<br/><span style="color:#666;font-size:11px;">' + p.address + '</span>' : ''), {
                autoClose: false,
                closeOnClick: false,
                closeButton: true
              });
            }

            marker.on('click', function(e) {
              lastMarkerClickTime = Date.now();
              L.DomEvent.stopPropagation(e);
              marker.openPopup();
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'markerPress',
                  stepId: p.stepId,
                  day: p.day
                }));
              }
            });

            marker.addTo(markersLayer);
            markersMap[p.stepId] = marker;

            if (p.isSelected) {
              isProgrammaticPopupChange = true;
              marker.openPopup();
              isProgrammaticPopupChange = false;
            }
          }
        });
      }

      // Rimuovi marker eliminati
      for (var id in markersMap) {
        if (!activeStepIds[id]) {
          markersLayer.removeLayer(markersMap[id]);
          delete markersMap[id];
        }
      }

      // Marker di selezione (modalità pickMode): ricreati a ogni aggiornamento, sono pochi
      pickLayer.clearLayers();
      pickMarkerList = data.pickMarkers || [];
      var pickKeys = [];
      pickMarkerList.forEach(function(m) {
        pickKeys.push(m.lat + ',' + m.lng);
        bounds.push([m.lat, m.lng]);
        L.marker([m.lat, m.lng], { icon: createPin(m.color, false, ''), zIndexOffset: 900 }).addTo(pickLayer);
      });
      // Se il punto scelto cambia dall'esterno (ricerca testuale) sposta la mappa; se arriva da un tap resta com'è
      if (hasInitialFit && lastPickKeys) {
        for (var i = 0; i < pickKeys.length; i++) {
          if (lastPickKeys.indexOf(pickKeys[i]) === -1 && pickKeys[i] !== lastTapKey) {
            map.flyTo([pickMarkerList[i].lat, pickMarkerList[i].lng], Math.max(map.getZoom(), 14), { duration: 0.7 });
            break;
          }
        }
      }
      lastPickKeys = pickKeys;

      // Posizione utente (aggiorna coordinate senza ricreare)
      if (data.userLocation && data.userLocation.latitude) {
        if (userMarker) {
          userMarker.setLatLng([data.userLocation.latitude, data.userLocation.longitude]);
        } else {
          userMarker = L.marker([data.userLocation.latitude, data.userLocation.longitude], {
            icon: userIcon,
            zIndexOffset: 500
          }).addTo(userLayer);
        }
      } else if (userMarker) {
        userLayer.removeLayer(userMarker);
        userMarker = null;
      }

      // Aggiorna lo stile mappa (Satellite Hybrid / Standard)
      if (data.mapType) {
        updateTileLayer(data.mapType);
      }

      // Se i punti sono vuoti ma ci sono rotte, usa le coordinate delle rotte come bounds
      if (bounds.length === 0 && data.routes && data.routes.length > 0) {
        data.routes.forEach(function(r) {
          if (r.coords && r.coords.length > 0) {
            r.coords.forEach(function(c) {
              bounds.push(c);
            });
          }
        });
      }

      // Centra sui dati: all'avvio (con retries per layout WebView/animazioni), forceFit o cambio giorno
      function applyFit(isDaySwitch) {
        if (!bounds || bounds.length === 0) return false;
        map.invalidateSize();
        var size = map.getSize();
        if (!size || size.x <= 0 || size.y <= 0) {
          return false;
        }

        if (bounds.length === 1) {
          if (isDaySwitch) {
            map.flyTo(bounds[0], 14, { duration: 0.8 });
          } else {
            map.setView(bounds[0], 14, { animate: false });
          }
        } else if (bounds.length > 1) {
          if (isDaySwitch) {
            map.flyToBounds(bounds, { padding: [32, 32], maxZoom: 15, duration: 0.8 });
          } else {
            map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15, animate: false });
          }
        }
        return true;
      }

      var dayChanged = (currentDayInMap !== null && currentDayInMap !== data.selectedDay);
      var shouldFit = !hasInitialFit || forceFit || dayChanged;

      if (shouldFit && bounds.length > 0) {
        var isSwitch = dayChanged && hasInitialFit && !forceFit;
        currentDayInMap = data.selectedDay;
        if (isSwitch) {
          userHasInteracted = false;
          applyFit(true);
        } else {
          var success = applyFit(false);
          if (success) {
            hasInitialFit = true;
          }
          // Ritenta progressivamente per sincronizzarsi con il completamento del rendering nativo
          setTimeout(function() {
            if (!userHasInteracted) {
              if (applyFit(false)) hasInitialFit = true;
            }
          }, 120);

          setTimeout(function() {
            if (!userHasInteracted) {
              if (applyFit(false)) hasInitialFit = true;
            }
          }, 350);

          setTimeout(function() {
            if (!userHasInteracted) {
              if (applyFit(false)) hasInitialFit = true;
            }
          }, 700);
        }
      }
    };

    // Primo render immediato con i dati iniziali
    if (initialData.mapType) {
      updateTileLayer(initialData.mapType);
    }
    window.updateMapData(initialData, true);

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    }
  </script>
</body>
</html>
    `
  }, [])

  const webViewSource = useMemo(() => ({ html: initialHtml }), [initialHtml])

  return (
    <View style={[styles.container, { backgroundColor: mapType === 'standard' ? '#e5e3df' : '#18181B' }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={webViewSource}
        style={styles.webView}
        scrollEnabled={false}
        nestedScrollEnabled={true}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onLoadEnd={() => {
          isLoadedRef.current = true
          sendMapUpdate(latestMapDataRef.current, true)
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data)
            if (data.type === 'ready') {
              isLoadedRef.current = true
              sendMapUpdate(latestMapDataRef.current, true)
            } else if (data.type === 'touchStart') {
              onMapTouchChange?.(true)
            } else if (data.type === 'touchEnd') {
              onMapTouchChange?.(false)
            } else if (data.type === 'markerPress' && onStepPress) {
              const matchedStep = steps.find(
                (s) => `${s.title}_${s.startDateTime}` === data.stepId || s.title === data.stepId
              )
              if (matchedStep) {
                onStepPress(matchedStep, data.day)
              }
            } else if (data.type === 'pick') {
              onPickLocation?.(data.lat, data.lng)
            } else if (data.type === 'mapPress' && onDeselectStep) {
              onDeselectStep()
            }
          } catch (err) {
            console.warn('Errore parsing messaggio WebView:', err)
          }
        }}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
})

export default LeafletMap
