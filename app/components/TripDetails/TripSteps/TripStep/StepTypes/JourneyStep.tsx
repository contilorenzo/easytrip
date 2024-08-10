import { ViewStyle } from 'react-native'
import { JourneyData, TripStep, VEHICLES } from '../../types'
import DefaultStep from './DefaultStep'
import { IonIcon } from '../../../../common/types'

const JourneyStep = ({ step, day }: Props): React.ReactNode => {
  return (
    <DefaultStep
      overrideStyle={styles}
      step={step}
      icon={getStepIcon(step)}
      day={day}
    />
  )
}

const getStepIcon = (step: TripStep<JourneyData>) => {
  const vehicle = step.extraData.vehicle

  const icons = {
    [VEHICLES.PLANE]: 'airplane',
    [VEHICLES.CAR]: 'car',
    [VEHICLES.BUS]: 'bus',
    [VEHICLES.FEET]: 'walk',
    [VEHICLES.TRAIN]: 'train',
  }

  return (icons[vehicle] ?? 'car') as IonIcon
}

interface Props {
  step: TripStep<JourneyData>
  day: string
}

const styles: ViewStyle = {
  backgroundColor: '#C8D0D0',
}

export default JourneyStep
