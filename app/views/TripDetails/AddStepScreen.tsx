import { SafeAreaView, ScrollView } from 'react-native'
import AddStep from '../../components/TripDetails/TripSteps/AddStep.tsx/AddStep'

const AddStepScreen = ({ route, navigation }) => {
  return (
    <ScrollView style={{ flex: 1, padding: 10 }}>
      <SafeAreaView>
        <AddStep day={route.params.day} navigation={navigation} />
      </SafeAreaView>
    </ScrollView>
  )
}

export default AddStepScreen
