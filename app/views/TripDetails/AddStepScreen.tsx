import { SafeAreaView, ScrollView } from 'react-native'
import AddStep from '../../components/TripDetails/TripSteps/AddStep.tsx/AddStep'
import { LogBox } from 'react-native'

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
])

const AddStepScreen = ({ route, navigation }) => {
  return (
    <ScrollView style={{ flex: 1, padding: 10 }}>
      <SafeAreaView>
        <AddStep navigation={navigation} {...route.params} />
      </SafeAreaView>
    </ScrollView>
  )
}

export default AddStepScreen
