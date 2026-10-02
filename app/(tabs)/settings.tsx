import { SafeAreaView } from 'react-native-safe-area-context'
import Settings from '../../src/components/Settings/Settings'

const SettingsScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Settings />
    </SafeAreaView>
  )
}

export default SettingsScreen
