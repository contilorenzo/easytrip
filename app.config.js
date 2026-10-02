// Completa app.json con la chiave di Google Maps, che sta in .env.local (GOOGLE_MAPS_API_KEY) e non nel repository.
// Expo carica .env.local prima di valutare questo file.
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!googleMapsApiKey) {
    console.warn('Google Maps non configurato: manca GOOGLE_MAPS_API_KEY in .env.local')
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      config: { ...config.ios?.config, googleMapsApiKey },
    },
    android: {
      ...config.android,
      config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } },
    },
  }
}
