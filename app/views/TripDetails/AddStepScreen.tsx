import { SafeAreaView } from 'react-native-safe-area-context'
import AddStep from '../../components/TripDetails/TripSteps/AddStep.tsx/AddStep'

const AddStepScreen = ({ route, navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1, margin: 10, gap: 20 }}>
      <AddStep
        trip={route.params.trip}
        day={route.params.day}
        navigation={navigation}
      />
    </SafeAreaView>
  )
}

export default AddStepScreen
