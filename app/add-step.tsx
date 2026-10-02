import { View } from 'react-native'
import AddStep from '../src/components/TripDetails/TripSteps/AddStep.tsx/AddStep'
import { useLocalSearchParams, Stack } from 'expo-router'
import { StepType } from '../src/components/TripDetails/TripSteps/types'

const AddStepScreen = () => {
  const params = useLocalSearchParams<{ start: string; end: string; type?: string }>()

  return (
    <>
      {/* L'intestazione è disegnata dal form (gradiente con titolo e pulsante indietro) */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <AddStep
          start={new Date(params.start)}
          end={new Date(params.end)}
          type={params.type as StepType | undefined}
        />
      </View>
    </>
  )
}

export default AddStepScreen
