import { View } from 'react-native'
import UpdateStep from '../src/components/TripDetails/TripSteps/UpdateStep/UpdateStep'
import { useLocalSearchParams } from 'expo-router'

const UpdateStepScreen = () => {
  const params = useLocalSearchParams<{ stepData: string }>()
  const stepData = JSON.parse(params.stepData)

  return (
    <>
      {/* L'intestazione (gradiente con titolo) è disegnata dal form, che gestisce anche la barra nativa */}
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <UpdateStep stepData={stepData} />
      </View>
    </>
  )
}

export default UpdateStepScreen
