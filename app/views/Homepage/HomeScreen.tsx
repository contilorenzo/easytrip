import AddNewTripButton from '../../components/AddNewTrip/AddNewTripButton'
import TripsList from '../../components/TripsList/TripsList'
import { SafeAreaView } from 'react-native'

const HomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, margin: 10, gap: 20 }}>
      <AddNewTripButton isFirstTrip={true} navigation={navigation} />
      <TripsList />
    </SafeAreaView>
  )
}

export default HomeScreen
