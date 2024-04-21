import NewTripForm from '../../components/AddNewTrip/NewTripForm'
import { SafeAreaView } from 'react-native'

const NewTripScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, padding: 10, gap: 20 }}>
      <NewTripForm />
    </SafeAreaView>
  )
}

export default NewTripScreen
