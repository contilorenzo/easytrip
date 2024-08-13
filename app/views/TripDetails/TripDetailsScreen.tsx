import { ScrollView } from 'react-native'
import TripDetails from '../../components/TripDetails/TripDetails'

const TripDetailsScreen = ({ route, navigation }) => {
  return (
    <ScrollView style={{ flex: 1, margin: 10, gap: 20 }}>
      <TripDetails navigation={navigation}></TripDetails>
    </ScrollView>
  )
}

export default TripDetailsScreen
