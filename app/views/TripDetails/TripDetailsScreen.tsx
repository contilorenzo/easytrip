import { ScrollView } from 'react-native'
import TripDetails from '../../components/TripDetails/TripDetails'
import { SafeAreaView } from 'react-native-safe-area-context'

const TripDetailsScreen = ({ navigation }) => {
  return (
    <ScrollView style={{ flex: 1, padding: 10 }}>
      <SafeAreaView edges={['bottom', 'left', 'right']}>
        <TripDetails navigation={navigation}></TripDetails>
      </SafeAreaView>
    </ScrollView>
  )
}

export default TripDetailsScreen
