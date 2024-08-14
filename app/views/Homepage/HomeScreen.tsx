import AddNewTripButton from '../../components/AddNewTrip/AddNewTripButton'
import TripsList from '../../components/TripsList/TripsList'
import { ScrollView } from 'react-native'
import { useTripsContext } from '../../state/TripsContext'

const HomeScreen = ({ navigation }) => {
  const { trips } = useTripsContext()

  return (
    <ScrollView style={{ flex: 1, padding: 10 }}>
      <AddNewTripButton
        isFirstTrip={trips.length === 0}
        navigation={navigation}
      />
      <TripsList navigation={navigation} />
    </ScrollView>
  )
}

export default HomeScreen
