import { ViewStyle } from 'react-native'
import { TripStep, VisitData } from '../../types'
import DefaultStep from './DefaultStep'

const VisitStep = ({
  step,
  day,
  onStepPress,
  selectedStep
}: Props): React.ReactNode => {
  return (
    <DefaultStep
      step={step}
      icon="location-outline"
      day={day}
      onStepPress={onStepPress}
      selectedStep={selectedStep}
    />
  )
}

interface Props {
  step: TripStep<VisitData>
  day: string
  onStepPress?: (step: TripStep<any>, day?: string) => void
  selectedStep?: any
}

export default VisitStep
