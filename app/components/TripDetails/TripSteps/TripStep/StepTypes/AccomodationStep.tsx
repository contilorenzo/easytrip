import { ViewStyle } from 'react-native'
import { AccomodationData, TripStep } from '../../types'
import DefaultStep from './DefaultStep'

const AccomodationStep = ({ step, day }: Props): React.ReactNode => {
  return (
    <DefaultStep overrideStyle={styles} step={step} icon="home" day={day} />
  )
}

interface Props {
  step: TripStep<AccomodationData>
  day: string
}

const styles: ViewStyle = {
  backgroundColor: '#ECDCB0',
}

export default AccomodationStep
