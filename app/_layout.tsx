import { applyGlobalFont } from '../src/utils/applyGlobalFont'
import * as SplashScreen from 'expo-splash-screen'
import {
  useFonts,
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_700Bold_Italic,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { Stack } from 'expo-router'
import { TripsContextProvider } from '../src/state/TripsContext'
import { AccountContextProvider } from '../src/state/AccountContext'
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown'
import 'react-native-reanimated'
import 'react-native-gesture-handler'
import { t } from '../src/translations'
import { TranslationsKeys } from '../src/translations/types'

// Va fatto prima che compaia qualsiasi testo
applyGlobalFont()

SplashScreen.preventAutoHideAsync()
const Layout = () => {
  // Inter solo su Android; su iOS si usa il font di sistema, quindi non c'è nulla da caricare
  const [fontsLoaded, fontError] = useFonts(
    Platform.OS === 'android'
      ? {
          Inter_400Regular,
          Inter_400Regular_Italic,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
          Inter_700Bold_Italic,
          Inter_800ExtraBold,
          Inter_900Black,
        }
      : {},
  )

  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => {})
  }, [])

  // La schermata iniziale resta visibile finché i font non sono pronti (o falliscono: si usa quello di sistema)
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <AutocompleteDropdownContextProvider>
      <TripsContextProvider>
        <AccountContextProvider>
          <Stack
            screenOptions={{
              headerBackTitle: '',
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false, title: 'Home' }}
            />
            <Stack.Screen
              name="new-trip"
              options={{ title: t(TranslationsKeys.trip_newTripPageTitle) }}
            />
            <Stack.Screen
              name="auth-callback"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="trip-details"
              options={{ title: t(TranslationsKeys.trip_tripDetails) }}
            />
            <Stack.Screen
              name="add-step"
              options={{ title: t(TranslationsKeys.trip_addStep) }}
            />
            <Stack.Screen
              name="update-step"
              options={{ title: t(TranslationsKeys.trip_updateStep) }}
            />
          </Stack>
        </AccountContextProvider>
      </TripsContextProvider>
    </AutocompleteDropdownContextProvider>
  )
}

export default Layout
