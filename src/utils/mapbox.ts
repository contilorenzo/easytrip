// Token pubblico di Mapbox per le indicazioni stradali: sta in .env.local (EXPO_PUBLIC_MAPBOX_TOKEN), non nel codice
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ''

if (!MAPBOX_TOKEN) {
  console.warn('Mapbox non configurato: manca EXPO_PUBLIC_MAPBOX_TOKEN in .env.local')
}
