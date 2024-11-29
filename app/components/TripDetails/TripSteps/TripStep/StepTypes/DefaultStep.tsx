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
import { t } from '../../../../../translations'
import { TranslationsKeys } from '../../../../../translations/types'
import { ActionsMenuConfig } from '../../../../ActionsPopup/types'
import { useActionsPopupContext } from '../../../../ActionsPopup/ActionsPopupProvider'
import { ROUTES } from '../../../../common/db/routes'

const DefaultStep = ({
  navigation,
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
    const config: ActionsMenuConfig = {
      title: t(TranslationsKeys.warning),
      subtitle: `${t(TranslationsKeys.trip_step_removeConfirmDescription)} '${
        step.title
      }'`,
      actions: [
        {
          label: t(TranslationsKeys.delete),
          onClick: () => {
            removeStep(step, tripsContext)
          },
          icon: 'trash-outline',
          labelStyle: { color: 'red' },
          iconStyle: { color: 'red' },
        },
      ],
    }

    actionsPopupContext.showActionsMenu(config)
  }

  const handleUpdateClick = () => {
    navigation.navigate(ROUTES.UPDATE_STEP, { stepData: step })
  }

  const boxStyles: ViewStyle = {
    alignItems: 'center',
    backgroundColor: 'whitesmoke',
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 10,
    width: '84%',
    ...(overrideStyle ?? {}),
  }

  const divForPreviousDayStyles: ViewStyle = {
    backgroundColor: overrideStyle?.backgroundColor ?? 'transparent',
    borderRadius: 9999,
    height: 12,
    opacity: 0.6,
    position: 'absolute',
    top: -18,
    width: 30,
    zIndex: 2,
  }

  const actionsPopupContext = useActionsPopupContext()
  const actionsMenuConfig: ActionsMenuConfig = {
    title: step.title,
    subtitle:
      format(step.startDateTime, 'dd/MM HH:mm') +
      '     ' +
      format(step.endDateTime, 'dd/MM HH:mm'),
    actions: [
      {
        label: t(TranslationsKeys.update),
        onClick: () => {
          handleUpdateClick()
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
    ],
  }

  return (
    <>
      <View style={wrapperStyles}>
        <View style={boxStyles}>
          {followsPreviousDay() && <View style={divForPreviousDayStyles} />}
          <TouchableOpacity
            style={contentStyles}
            onPress={() =>
              actionsPopupContext.showActionsMenu(actionsMenuConfig)
            }
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
  navigation: any
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
  width: '84%',
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
