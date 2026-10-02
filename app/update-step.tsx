import { View } from 'react-native'
import UpdateStep from '../src/components/TripDetails/TripSteps/UpdateStep/UpdateStep'
import { useLocalSearchParams, Stack } from 'expo-router'

const UpdateStepScreen = () => {
  const params = useLocalSearchParams<{ stepData: string }>()
  const stepData = JSON.parse(params.stepData)

  return (
    <>
      {/* L'intestazione è disegnata dal form (gradiente con titolo e pulsante indietro) */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <UpdateStep stepData={stepData} />
      </View>
    </>
  )
}

export default UpdateStepScreen
