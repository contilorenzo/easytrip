import Settings from '../../components/Settings/Settings'
import { SafeAreaView } from 'react-native'

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, padding: 10 }}>
      <Settings navigation={navigation} />
    </SafeAreaView>
  )
}

export default HomeScreen
