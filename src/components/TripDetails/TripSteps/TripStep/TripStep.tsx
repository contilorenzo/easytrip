import { View, ViewStyle } from 'react-native'
import { StepType, TripStep as TripStepType } from '../types'
import AccomodationStep from './StepTypes/AccomodationStep'
import VisitStep from './StepTypes/VisitStep'
import DefaultStep from './StepTypes/DefaultStep'

const renderComponentByStepType = (
  step: TripStepType<any>,
  day: string,
  onStepPress?: (step: TripStepType<any>, day?: string) => void,
  selectedStep?: any
): React.ReactNode => {
  const components = {
    [StepType.ACCOMODATION]: (
      <AccomodationStep step={step} day={day} onStepPress={onStepPress} selectedStep={selectedStep} />
    ),
    [StepType.VISIT]: (
      <VisitStep step={step} day={day} onStepPress={onStepPress} selectedStep={selectedStep} />
    ),
  }

  const defaultStep = (
    <DefaultStep step={step} day={day} onStepPress={onStepPress} selectedStep={selectedStep} />
  )

  return components?.[step.type as keyof typeof components] ?? defaultStep
}

const TripStep = ({ step, day, onStepPress, selectedStep }: Props) => {
  return (
    <View style={wrapperStyles}>
      {renderComponentByStepType(step, day, onStepPress, selectedStep)}
    </View>
  )
}

interface Props {
  step: TripStepType<any>
  day: string
  onStepPress?: (step: TripStepType<any>, day?: string) => void
  selectedStep?: any
}

export default TripStep

const wrapperStyles: ViewStyle = {
  width: '100%',
}
