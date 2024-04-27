import AddNewTrip from '../../components/AddNewTrip/AddNewTrip'
import TripsList from '../../components/TripsList/TripsList'
import { SafeAreaView } from 'react-native'

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, margin: 10, gap: 20 }}>
      <AddNewTrip isFirstTrip={true} navigation={navigation} />
      <TripsList />
    </SafeAreaView>
  )
}

export default HomeScreen
