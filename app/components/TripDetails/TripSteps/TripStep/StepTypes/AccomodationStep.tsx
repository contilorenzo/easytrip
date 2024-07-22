import { ViewStyle } from 'react-native'
import { AccomodationData, TripStep } from '../../types'
import DefaultStep from './DefaultStep'

const AccomodationStep = ({ step }: Props): React.ReactNode => {
  return <DefaultStep overrideStyle={styles} step={step} icon="home" />
}

interface Props {
  step: TripStep<AccomodationData>
}

const styles: ViewStyle = {
  backgroundColor: '#ECDCB0',
}

export default AccomodationStep
