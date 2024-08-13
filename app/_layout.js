import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import BottomNavigation from './components/BottomNavigation/BottomNavigation'
import { TripsContextProvider } from './state/TripsContext'
import { Root as PopupRootProvider } from 'react-native-popup-confirm-toast'

SplashScreen.preventAutoHideAsync()
const Layout = () => {
  const showLayout = async () => {
    await SplashScreen.hideAsync()
  }

  useEffect(() => {
    showLayout()
  }, [])

  return (
    <PopupRootProvider>
      <TripsContextProvider>
        <BottomNavigation />
      </TripsContextProvider>
    </PopupRootProvider>
  )
}

export default Layout
