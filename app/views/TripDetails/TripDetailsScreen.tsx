import { SafeAreaView } from 'react-native'
import TripDetails from '../../components/TripDetails/TripDetails'

const TripDetailsScreen = ({ route }) => {

  return (
    <SafeAreaView style={{ flex: 1, margin: 10, gap: 20 }}>
      <TripDetails trip={route.params.trip}></TripDetails>
    </SafeAreaView>
  )
}

export default TripDetailsScreen
