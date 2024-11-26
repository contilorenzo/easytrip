import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import AppScreens from './components/AppScreens/AppScreens'
import { TripsContextProvider } from './state/TripsContext'
import { Root as PopupRootProvider } from 'react-native-popup-confirm-toast'
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown'
import { ActionsPopupProvider } from './components/ActionsPopup/ActionsPopupProvider'

SplashScreen.preventAutoHideAsync()
const Layout = () => {
  const showLayout = async () => {
    await SplashScreen.hideAsync()
  }

  useEffect(() => {
    showLayout()
  }, [])

  return (
    <ActionsPopupProvider>
      <AutocompleteDropdownContextProvider>
        <PopupRootProvider>
          <TripsContextProvider>
            <AppScreens />
          </TripsContextProvider>
        </PopupRootProvider>
      </AutocompleteDropdownContextProvider>
    </ActionsPopupProvider>
  )
}

export default Layout
