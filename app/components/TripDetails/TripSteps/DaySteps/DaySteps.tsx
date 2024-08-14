import {
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import TripStep from '../TripStep/TripStep'
import { TripStep as TripStepType } from '../types'
import { format, isAfter, isSameDay } from 'date-fns'
import { t } from '../../../../translations'
import { TranslationsKeys } from '../../../../translations/types'
import { Ionicons } from '@expo/vector-icons'
import { ROUTES } from '../../../common/db/routes'
import { useTripsContext } from '../../../../state/TripsContext'
import { it } from 'date-fns/locale'

const DaySteps = ({ day, steps, navigation }: Props) => {
  const handleAddStepClick = (day: string) => {
    navigation.navigate(ROUTES.ADD_STEP, { day })
  }

  const renderAddStepButton = ({
    hasLabel = true,
    iconSize,
  }: {
    hasLabel?: boolean
    iconSize?: number
  }) => (
    <TouchableOpacity
      onPress={() => handleAddStepClick(day)}
      style={{
        ...addStepStyles,
        ...(steps.length > 0 && { borderWidth: 0, minHeight: 0 }),
      }}
    >
      <Ionicons
        name="add-circle"
        style={{ ...addStepIconStyle, ...(iconSize && { fontSize: iconSize }) }}
      />
      {hasLabel && (
        <Text style={addStepLabelStyle}>
          {t(TranslationsKeys.trip_addStep)}
        </Text>
      )}
    </TouchableOpacity>
  )

  const getAddStepPosition = () => {
    if (Array.isArray(steps) && steps.length > 0) {
      const lastStep: TripStepType<any> = steps[steps.length - 1]
      const lastStartDate = new Date(lastStep.startDateTime)
      const lastEndDate = new Date(lastStep.endDateTime)

      const firstStep: TripStepType<any> = steps[0]
      const firstStartDate = new Date(firstStep.startDateTime)

      const currentDay = new Date(day)

      const continuesNextDay =
        !isSameDay(lastEndDate, lastStartDate) &&
        !isSameDay(lastEndDate, currentDay) &&
        isAfter(lastEndDate, currentDay)

      const followsPreviousDay =
        !isSameDay(lastEndDate, lastStartDate) &&
        isAfter(currentDay, firstStartDate)

      if (continuesNextDay && followsPreviousDay) return ButtonPos.LEFT
      if (continuesNextDay) return ButtonPos.TOP
      if (followsPreviousDay) return ButtonPos.BOTTOM
    }

    return ButtonPos.BOTTOM
  }

  const { currentTrip } = useTripsContext()

  return (
    <View style={wrapperStyles}>
      <View style={dayColumnStyles}>
        <View style={dayStyles}>
          <Text style={{ fontWeight: 'bold' }}>{formatDate(day, 'EEE')}</Text>
          <Text>{formatDate(day, 'dd/MM')}</Text>
        </View>
        {getAddStepPosition() === ButtonPos.LEFT &&
          renderAddStepButton({ hasLabel: false, iconSize: 24 })}
      </View>
      <View style={stepsColumnStyles}>
        {getAddStepPosition() === ButtonPos.TOP && renderAddStepButton({})}
        {steps.map((step) => (
          <TripStep
            step={step}
            key={step.title + '_' + step.startDateTime}
            day={day}
          />
        ))}
        {getAddStepPosition() === ButtonPos.BOTTOM && renderAddStepButton({})}
      </View>
    </View>
  )
}

enum ButtonPos {
  LEFT,
  BOTTOM,
  TOP,
}

const formatDate = (dayString: string, stringFormat: string) => {
  return format(new Date(dayString), stringFormat, { locale: it })
}

export default DaySteps

interface Props {
  day: string
  steps: TripStepType<any>[]
  navigation: any
}

const wrapperStyles: ViewStyle = {
  columnGap: 6,
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  paddingBottom: 8,
}

const dayColumnStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  gap: 6,
  justifyContent: 'center',
  padding: 4,
  width: '16%',
  borderRightColor: 'lightgray',
  borderRightWidth: 4,
}

const dayStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'center',
}

const stepsColumnStyles: ViewStyle = {
  display: 'flex',
  gap: 7,
  height: '100%',
  width: '82%',
}

const addStepStyles: ViewStyle = {
  alignItems: 'center',
  columnGap: 4,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  minHeight: 42,
  width: '84%',
}

const addStepLabelStyle: TextStyle = {
  color: 'rgba(0, 0, 0, 0.3)',
  fontSize: 14,
}

const addStepIconStyle: TextStyle = {
  color: 'rgba(0, 0, 0, 0.2)',
  fontSize: 16,
}
