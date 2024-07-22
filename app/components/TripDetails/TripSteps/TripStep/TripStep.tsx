import { Text, View, ViewStyle } from 'react-native'
import { StepType, TripStep as TripStepType } from '../types'
import AccomodationStep from './StepTypes/AccomodationStep'
import JourneyStep from './StepTypes/JourneyStep'
import VisitStep from './StepTypes/VisitStep'

const renderComponentByStepType = (
  step: TripStepType<any>
): React.ReactNode => {
  const components = {
    [StepType.ACCOMODATION]: <AccomodationStep step={step} />,
    [StepType.JOURNEY]: <JourneyStep step={step} />,
    [StepType.VISIT]: <VisitStep step={step} />,
  }

  const defaultStep = (
    <View>
      <Text>{step.type}</Text>
    </View>
  )

  return components?.[step.type] ?? defaultStep
}

const TripStep = ({ step }: Props) => {
  return <View style={wrapperStyles}>{renderComponentByStepType(step)}</View>
}

interface Props {
  step: TripStepType<any>
}

export default TripStep

const wrapperStyles: ViewStyle = {
  width: '100%',
}
