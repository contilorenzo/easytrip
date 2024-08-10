import { Text, TextStyle, View, ViewStyle } from 'react-native'
import { TripStep } from '../../types'
import { Ionicons } from '@expo/vector-icons'
import { IonIcon } from '../../../../common/types'
import { format, isAfter, isBefore, isEqual } from 'date-fns'

const DefaultStep = ({
  step,
  overrideStyle,
  icon,
  day,
}: Props): React.ReactNode => {
  const currentDay = new Date(day).getDay()
  const firstDay = new Date(step.startDateTime).getDay()
  const lastDay = new Date(step.endDateTime).getDay()

  const followsPreviousDay = () => {
    if (isAfter(currentDay, firstDay) && !isEqual(lastDay, firstDay)) {
      return true
    }
    return false
  }

  const continuesNextDay = () => {
    if (isBefore(currentDay, lastDay) && !isEqual(lastDay, firstDay)) {
      return true
    }
    return false
  }

  const wrapperStyles: ViewStyle = {
    columnGap: 6,
    display: 'flex',
    flexDirection: 'row',
  }

  const boxStyles: ViewStyle = {
    alignItems: 'center',
    backgroundColor: 'lightgray',
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
    width: '84%',
    ...(overrideStyle ?? {}),
  }

  const contentStyles: ViewStyle = {
    alignItems: 'center',
    columnGap: 10,
    display: 'flex',
    flexDirection: 'row',
    padding: 12,
    width: '100%',
  }

  const divForPreviousDayStyles: ViewStyle = {
    backgroundColor: overrideStyle?.backgroundColor ?? 'transparent',
    height: 8,
    opacity: 0.6,
    position: 'absolute',
    top: -12,
    width: '90%',
    zIndex: 2,
  }

  const hoursStyle: ViewStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: 3,
    paddingTop: 3,
  }

  const timestampStyle: TextStyle = {
    color: 'rgba(0, 0, 0, 0.8)',
    fontSize: 12,
  }

  return (
    <View style={wrapperStyles}>
      <View style={boxStyles}>
        {followsPreviousDay() && <View style={divForPreviousDayStyles} />}
        <View style={contentStyles}>
          {icon && <Ionicons name={icon} size={20} />}
          <Text style={{ fontWeight: 'bold' }}>{step.title}</Text>
        </View>
      </View>
      <View style={hoursStyle}>
        <Text style={timestampStyle}>
          {!followsPreviousDay() &&
            format(new Date(step.startDateTime), 'HH:mm')}
        </Text>
        <Text style={timestampStyle}>
          {!continuesNextDay() && format(new Date(step.endDateTime), 'HH:mm')}
        </Text>
      </View>
    </View>
  )
}

interface Props {
  step: TripStep<any>
  overrideStyle?: ViewStyle
  icon?: IonIcon
  day: string
}

export default DefaultStep
