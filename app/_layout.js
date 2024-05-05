import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import BottomNavigation from './components/BottomNavigation/BottomNavigation'

SplashScreen.preventAutoHideAsync()
const Layout = () => {
  const showLayout = async () => {
    await SplashScreen.hideAsync()
  }

  useEffect(() => {
    showLayout()
  }, [])

  return (
    <>
      <BottomNavigation />
    </>
  )
}

export default Layout
