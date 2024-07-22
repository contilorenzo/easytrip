import { Text, View, ViewStyle } from 'react-native'
import { TripStep } from '../../types'
import { Ionicons } from '@expo/vector-icons'
import { getDurationInHours } from './utils'
import { IonIcon } from '../../../../common/types'

const DefaultStep = ({ step, overrideStyle, icon }: Props): React.ReactNode => {
  const wrapperStyles: ViewStyle = {
    alignItems: 'center',
    backgroundColor: 'lightgray',
    borderRadius: 8,
    columnGap: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    width: '100%',
    ...(overrideStyle ?? {}),
  }

  return (
    <View style={wrapperStyles}>
      {icon && <Ionicons name={icon} size={20} />}
      <Text>{step.title}</Text>
      <Text>{getDurationInHours(step)}h</Text>
    </View>
  )
}

interface Props {
  step: TripStep<any>
  overrideStyle?: ViewStyle
  icon?: IonIcon
}

export default DefaultStep
