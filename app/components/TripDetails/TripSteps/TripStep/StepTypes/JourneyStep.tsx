import { ViewStyle } from 'react-native'
import { JourneyData, TripStep, VEHICLES } from '../../types'
import DefaultStep from './DefaultStep'
import { IonIcon } from '../../../../common/types'

const JourneyStep = ({ navigation, step, day }: Props): React.ReactNode => {
  return (
    <DefaultStep
      navigation={navigation}
      overrideStyle={styles}
      step={step}
      icon={getVehicleIcon(step.extraData.vehicle)}
      day={day}
    />
  )
}

export const getVehicleIcon = (vehicle: VEHICLES) => {
  const icons = {
    [VEHICLES.PLANE]: 'airplane',
    [VEHICLES.CAR]: 'car',
    [VEHICLES.BUS]: 'bus',
    [VEHICLES.FEET]: 'walk',
    [VEHICLES.TRAIN]: 'train',
    [VEHICLES.BOAT]: 'boat',
  }

  return (icons[vehicle] ?? 'car') as IonIcon
}

interface Props {
  navigation: any
  step: TripStep<JourneyData>
  day: string
}

const styles: ViewStyle = {
  backgroundColor: '#C8D0D0',
}

export default JourneyStep
