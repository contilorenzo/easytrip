import { TouchableOpacity, View, ViewStyle } from 'react-native'
import { TripStep as TripStepType } from '../TripSteps/types'
import TripStep from './TripStep/TripStep'

const TripSteps = ({ steps }: Props) => {
  return (
    <View style={wrapperStyles}>
      {steps && steps.length > 0 ? (
        steps.map((step) => <TripStep step={step} key={step.title} />)
      ) : (
        <TouchableOpacity>Aggiungi tappa</TouchableOpacity>
      )}
    </View>
  )
}

interface Props {
  steps: TripStepType<any>[]
}

export default TripSteps

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  marginTop: 20,
  rowGap: 8,
}
