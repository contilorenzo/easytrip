import { View, ViewStyle } from 'react-native'
import { StepType, TripStep as TripStepType } from '../types'
import AccomodationStep from './StepTypes/AccomodationStep'
import JourneyStep from './StepTypes/JourneyStep'
import VisitStep from './StepTypes/VisitStep'
import DefaultStep from './StepTypes/DefaultStep'

const renderComponentByStepType = (
  step: TripStepType<any>,
  day: string,
  navigation: any
): React.ReactNode => {
  const components = {
    [StepType.ACCOMODATION]: (
      <AccomodationStep navigation={navigation} step={step} day={day} />
    ),
    [StepType.JOURNEY]: (
      <JourneyStep navigation={navigation} step={step} day={day} />
    ),
    [StepType.VISIT]: (
      <VisitStep navigation={navigation} step={step} day={day} />
    ),
  }

  const defaultStep = (
    <DefaultStep navigation={navigation} step={step} day={day} />
  )

  return components?.[step.type] ?? defaultStep
}

const TripStep = ({ navigation, step, day }: Props) => {
  return (
    <View style={wrapperStyles}>
      {renderComponentByStepType(step, day, navigation)}
    </View>
  )
}

interface Props {
  navigation: any
  step: TripStepType<any>
  day: string
}

export default TripStep

const wrapperStyles: ViewStyle = {
  width: '100%',
}
