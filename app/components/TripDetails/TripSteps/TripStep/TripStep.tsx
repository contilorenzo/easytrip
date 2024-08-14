import { Text, View, ViewStyle } from 'react-native'
import { StepType, TripStep as TripStepType } from '../types'
import AccomodationStep from './StepTypes/AccomodationStep'
import JourneyStep from './StepTypes/JourneyStep'
import VisitStep from './StepTypes/VisitStep'
import DefaultStep from './StepTypes/DefaultStep'

const renderComponentByStepType = (
  step: TripStepType<any>,
  day: string
): React.ReactNode => {
  const components = {
    [StepType.ACCOMODATION]: <AccomodationStep step={step} day={day} />,
    [StepType.JOURNEY]: <JourneyStep step={step} day={day} />,
    [StepType.VISIT]: <VisitStep step={step} day={day} />,
  }

  const defaultStep = <DefaultStep step={step} day={day} />

  return components?.[step.type] ?? defaultStep
}

const TripStep = ({ step, day }: Props) => {
  return (
    <View style={wrapperStyles}>{renderComponentByStepType(step, day)}</View>
  )
}

interface Props {
  step: TripStepType<any>
  day: string
}

export default TripStep

const wrapperStyles: ViewStyle = {
  width: '100%',
}
