import {
  Text,
  TextStyle,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native'
import { StepType, TripStep } from '../../types'
import { Ionicons } from '@expo/vector-icons'
import { IonIcon } from '../../../../common/types'
import { format, isAfter, isBefore, isEqual } from 'date-fns'
import { removeStep } from '../../../../common/db/utils'
import { useTripsContext } from '../../../../../state/TripsContext'
import { Popup } from 'react-native-popup-confirm-toast'
import { t } from '../../../../../translations'
import { TranslationsKeys } from '../../../../../translations/types'
import { Action } from '../../../../ActionsPopup/types'
import { useActionsPopupContext } from '../../../../ActionsPopup/ActionsPopupProvider'

const DefaultStep = ({
  step,
  overrideStyle,
  icon,
  day,
}: Props): React.ReactNode => {
  const currentDay = new Date(day).setHours(0, 0, 0, 0)
  const firstDay = new Date(step.startDateTime).setHours(0, 0, 0, 0)
  const lastDay = new Date(step.endDateTime).setHours(0, 0, 0, 0)

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

  const tripsContext = useTripsContext()

  const handleRemoveClick = () => {
    Popup.show({
      // @ts-ignore
      type: 'confirm',
      title: t(TranslationsKeys.trip_step_removeConfirmTitle),
      textBody: t(TranslationsKeys.trip_step_removeConfirmDescription),
      buttonText: t(TranslationsKeys.confirm),
      confirmText: t(TranslationsKeys.cancel),
      bounciness: 5,
      startDuration: 100,
      hiddenDuration: 100,
      callback: () => {
        removeStep(step, tripsContext)
        Popup.hide()
      },
      cancelCallback: () => {
        Popup.hide()
      },
    })
  }

  const boxStyles: ViewStyle = {
    alignItems: 'center',
    borderColor: 'lightgray',
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'visible',
    position: 'relative',
    width: '84%',
    ...(overrideStyle ?? {}),
  }

  const divForPreviousDayStyles: ViewStyle = {
    backgroundColor: overrideStyle?.backgroundColor ?? 'transparent',
    borderRadius: 9999,
    height: 12,
    opacity: 0.6,
    position: 'absolute',
    top: -20,
    width: 30,
    zIndex: 2,
  }

  const actionsPopupContext = useActionsPopupContext()
  const actions: Action[] = [
    {
      label: t(TranslationsKeys.update),
      onClick: () => {
        alert(t(TranslationsKeys.update))
      },
      icon: 'build',
    },
    {
      label: t(TranslationsKeys.delete),
      onClick: () => {
        handleRemoveClick()
      },
      icon: 'trash-outline',
      labelStyle: { color: 'red' },
      iconStyle: { color: 'red' },
    },
  ]

  return (
    <>
      <View style={wrapperStyles}>
        <View style={boxStyles}>
          {followsPreviousDay() && <View style={divForPreviousDayStyles} />}
          <TouchableOpacity
            style={contentStyles}
            onLongPress={() => actionsPopupContext.showActions(actions)}
          >
            <Ionicons name={icon ?? getStepTypeIcon(step.type)} size={20} />
            <Text style={contentTextStyles}>{step.title}</Text>
          </TouchableOpacity>
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
    </>
  )
}

export const getStepTypeIcon = (stepType: StepType) => {
  const icons = {
    [StepType.ACCOMODATION]: 'bed',
    [StepType.JOURNEY]: 'map',
    [StepType.FOOD]: 'pizza',
    [StepType.VISIT]: 'images',
  }

  return (icons[stepType] ?? 'calendar') as IonIcon
}

interface Props {
  step: TripStep<any>
  overrideStyle?: ViewStyle
  icon?: IonIcon
  day: string
}

const wrapperStyles: ViewStyle = {
  columnGap: 6,
  display: 'flex',
  flexDirection: 'row',
}

const contentStyles: ViewStyle = {
  alignItems: 'center',
  columnGap: 10,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'flex-start',
  padding: 12,
  width: '100%',
}

const contentTextStyles: TextStyle = {
  fontWeight: 'bold',
  width: '76%',
}

const hoursStyle: ViewStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  paddingBottom: 5,
  paddingTop: 5,
}

const timestampStyle: TextStyle = {
  color: 'rgba(0, 0, 0, 0.8)',
  fontSize: 12,
}

export default DefaultStep
