import { ViewStyle } from 'react-native'
import { AccomodationData, TripStep } from '../../types'
import DefaultStep from './DefaultStep'

const AccomodationStep = ({
  step,
  day,
  onStepPress,
  selectedStep
}: Props): React.ReactNode => {
  return (
    <DefaultStep
      step={step}
      icon="bed-outline"
      day={day}
      onStepPress={onStepPress}
      selectedStep={selectedStep}
    />
  )
}

interface Props {
  step: TripStep<AccomodationData>
  day: string
  onStepPress?: (step: TripStep<any>, day?: string) => void
  selectedStep?: any
}

export default AccomodationStep
