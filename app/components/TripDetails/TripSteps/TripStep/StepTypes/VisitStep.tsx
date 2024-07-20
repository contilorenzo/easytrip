import { ViewStyle } from 'react-native'
import { TripStep } from '../../types'
import DefaultStep from './DefaultStep'

const VisitStep = ({ step }: Props): React.ReactNode => {
  return <DefaultStep overrideStyle={styles} step={step} icon="image" />
}

interface Props {
  step: TripStep
}

const styles: ViewStyle = {
  backgroundColor: '#C6C8EE',
}

export default VisitStep
