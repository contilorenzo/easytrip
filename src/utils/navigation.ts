import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native'
import { Location } from '../components/TripDetails/TripSteps/types'

interface NavAppOption {
  title: string
  open: () => Promise<void>
}

export const openDirections = async (location: Location) => {
  if (!location?.coordinates) return

  const { lat, lng } = location.coordinates
  const name = location.name || 'Destinazione'
  const encodedName = encodeURIComponent(name)

  const availableApps: NavAppOption[] = []

  // 1. Apple Maps (iOS only)
  if (Platform.OS === 'ios') {
    availableApps.push({
      title: 'Mappe (Apple)',
      open: async () => {
        const url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodedName}`
        await Linking.openURL(url).catch(() => {})
      },
    })
  }

  // 2. Google Maps
  // Try native scheme first, then fall back to web directions if not installed
  availableApps.push({
    title: 'Google Maps',
    open: async () => {
      const nativeUrl = Platform.select({
        ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
        android: `google.navigation:q=${lat},${lng}`,
      })!
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

      Linking.openURL(nativeUrl).catch(() => {
        Linking.openURL(webUrl).catch(() => {})
      })
    },
  })

  // 3. Waze
  availableApps.push({
    title: 'Waze',
    open: async () => {
      const nativeUrl = `waze://?ll=${lat},${lng}&navigate=yes`
      const webUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`

      Linking.openURL(nativeUrl).catch(() => {
        Linking.openURL(webUrl).catch(() => {})
      })
    },
  })

  // Show native system UI
  if (Platform.OS === 'ios') {
    const options = [...availableApps.map((a) => a.title), 'Annulla']
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `Indicazioni per ${name}`,
        message: location.address || undefined,
        options,
        cancelButtonIndex: options.length - 1,
      },
      (buttonIndex) => {
        if (buttonIndex < availableApps.length) {
          availableApps[buttonIndex].open()
        }
      }
    )
  } else {
    Alert.alert(
      `Indicazioni per ${name}`,
      location.address || 'Seleziona un navigatore',
      [
        ...availableApps.map((app) => ({
          text: app.title,
          onPress: app.open,
        })),
        { text: 'Annulla', style: 'cancel' },
      ],
      { cancelable: true }
    )
  }
}
