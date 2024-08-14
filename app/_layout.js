import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import BottomNavigation from './components/BottomNavigation/BottomNavigation'
import { TripsContextProvider } from './state/TripsContext'
import { Root as PopupRootProvider } from 'react-native-popup-confirm-toast'
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown'

SplashScreen.preventAutoHideAsync()
const Layout = () => {
  const showLayout = async () => {
    await SplashScreen.hideAsync()
  }

  useEffect(() => {
    showLayout()
  }, [])

  return (
    <AutocompleteDropdownContextProvider>
      <PopupRootProvider>
        <TripsContextProvider>
          <BottomNavigation />
        </TripsContextProvider>
      </PopupRootProvider>
    </AutocompleteDropdownContextProvider>
  )
}

export default Layout
