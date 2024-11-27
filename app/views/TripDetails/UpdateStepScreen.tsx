import { SafeAreaView, ScrollView } from 'react-native'
import { LogBox } from 'react-native'
import UpdateStep from '../../components/TripDetails/TripSteps/UpdateStep/UpdateStep'

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
])

const UpdateStepScreen = ({ route, navigation }) => {
  return (
    <ScrollView style={{ flex: 1, padding: 10 }}>
      <SafeAreaView>
        <UpdateStep navigation={navigation} {...route.params} />
      </SafeAreaView>
    </ScrollView>
  )
}

export default UpdateStepScreen
