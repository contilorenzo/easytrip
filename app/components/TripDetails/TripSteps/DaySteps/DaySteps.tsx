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
import { Trip } from '../../../TripsList/types'

const DaySteps = ({ day, steps, navigation, trip }: Props) => {
  const handleAddStepClick = (day: string) => {
    navigation.navigate(ROUTES.ADD_STEP, { trip, day })
  }

  const renderAddStepButton = () => (
    <TouchableOpacity
      onPress={() => handleAddStepClick(day)}
      style={{
        ...addStepStyles,
        ...(steps.length > 0 && { borderWidth: 0, minHeight: 0 }),
      }}
    >
      <Ionicons name="add-circle" style={addStepIconStyle} />
      <Text style={addStepLabelStyle}>{t(TranslationsKeys.trip_addStep)}</Text>
    </TouchableOpacity>
  )

  const continuesNextDay = () => {
    if (Array.isArray(trip.steps) && trip.steps.length > 0) {
      const lastStep: TripStepType<any> = trip.steps[trip.steps.length - 1]
      const startDate = new Date(lastStep.startDateTime)
      const endDate = new Date(lastStep.endDateTime)

      if (isSameDay(new Date(day), endDate)) return false
      return isAfter(endDate, startDate)
    }

    return false
  }

  return (
    <View style={wrapperStyles}>
      <View style={dayStyles}>
        <Text style={{ fontWeight: 'bold' }}>{formatDate(day, 'EEE')}</Text>
        <Text>{formatDate(day, 'dd/MM')}</Text>
      </View>
      <View style={stepsColumnStyles}>
        {continuesNextDay() && renderAddStepButton()}
        {steps.map((step) => (
          <TripStep step={step} key={step.title} day={day} />
        ))}
        {!continuesNextDay() && renderAddStepButton()}
      </View>
    </View>
  )
}

const formatDate = (dayString: string, stringFormat: string) => {
  return format(new Date(dayString), stringFormat)
}

export default DaySteps

interface Props {
  day: string
  steps: TripStepType<any>[]
  navigation: any
  trip: Trip
}

const wrapperStyles: ViewStyle = {
  columnGap: 6,
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  paddingBottom: 8,
}

const dayStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'center',
  padding: 4,
  width: '16%',
  borderRightColor: 'lightgray',
  borderRightWidth: 4,
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
