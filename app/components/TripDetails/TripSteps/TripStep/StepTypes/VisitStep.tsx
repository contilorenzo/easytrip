import { ViewStyle } from 'react-native'
import { TripStep, VisitData } from '../../types'
import DefaultStep from './DefaultStep'

const VisitStep = ({ step, day }: Props): React.ReactNode => {
  return (
    <DefaultStep overrideStyle={styles} step={step} icon="image" day={day} />
  )
}

interface Props {
  step: TripStep<VisitData>
  day: string
}

const styles: ViewStyle = {
  backgroundColor: '#C6C8EE',
}

export default VisitStep
