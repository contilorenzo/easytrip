import {
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import TripStep from '../TripStep/TripStep'
import { TripStep as TripStepType } from '../types'
import {
  Interval,
  addMinutes,
  format,
  interval,
  isSameDay,
  isWithinInterval,
  getHours,
  setHours,
  setMinutes,
  subMinutes,
} from 'date-fns'
import { t } from '../../../../translations'
import { TranslationsKeys } from '../../../../translations/types'
import { Ionicons } from '@expo/vector-icons'
import { ROUTES } from '../../../common/db/routes'
import { it } from 'date-fns/locale'

const getOccupiedIntervals = (steps: TripStepType<any>[], day: string) => {
  const occupiedIntervals = []

  steps.forEach((step) => {
    const startDateTime = isSameDay(new Date(step.startDateTime), new Date(day))
      ? new Date(step.startDateTime)
      : new Date(day).setHours(0, 0, 0)
    const endDateTime = isSameDay(new Date(step.endDateTime), new Date(day))
      ? new Date(step.endDateTime)
      : new Date(day).setHours(24, 0, 0)

    occupiedIntervals.push(interval(startDateTime, endDateTime))
  })

  return occupiedIntervals
}

const DaySteps = ({ day, steps, navigation }: Props) => {
  const handleAddStepClick = (day: string, start: Date, end: Date) => {
    navigation.navigate(ROUTES.ADD_STEP, { day, start, end })
  }

  const getFreeIntervals = (occupiedIntervals: Interval[]) => {
    const freeIntervals: Interval[] = []
    occupiedIntervals.forEach((occ, index) => {
      const nextInterval = occupiedIntervals?.[index + 1]

      const startOfDay = new Date(occ.start).setHours(0, 0, 0)
      const endOfDay = new Date(occ.start).setHours(24, 0, 0)

      const isFirstInterval = index === 0
      const hasFreeTimeBefore = getHours(occ.start) !== 0

      const isLastInterval = index === occupiedIntervals.length - 1
      const hasFreeTimeAfter = getHours(occ.end) !== 24

      // Handle free time at the start of the day
      if (isFirstInterval && hasFreeTimeBefore) {
        freeIntervals.push(interval(startOfDay, new Date(occ.start)))
      }

      // Handle free time at the end of the day
      if (isLastInterval && hasFreeTimeAfter) {
        freeIntervals.push(interval(new Date(occ.end), endOfDay))
        return
      }

      if (!nextInterval) return
      if (
        format(new Date(occ.end), 'HHmm') ===
        format(new Date(nextInterval.start), 'HHmm')
      )
        return

      freeIntervals.push(
        interval(new Date(occ.end), new Date(nextInterval.start))
      )
    })

    return freeIntervals
  }

  const renderAddStepButton = ({
    hasLabel = true,
    iconSize,
    start,
    end,
  }: {
    hasLabel?: boolean
    iconSize?: number
    start: Date
    end: Date
  }) => {
    return (
      <TouchableOpacity
        onPress={() => handleAddStepClick(day, start, end)}
        style={{
          ...addStepStyles,
          ...(steps.length > 0 && { borderWidth: 0, minHeight: 0 }),
        }}
      >
        <Ionicons
          name="add-circle"
          style={{
            ...addStepIconStyle,
            ...(iconSize && { fontSize: iconSize }),
          }}
        />
        {hasLabel && (
          <Text style={addStepLabelStyle}>
            {t(TranslationsKeys.trip_addStep)}
          </Text>
        )}
      </TouchableOpacity>
    )
  }

  const renderAddStep = (dateTime: Date, day: string) => {
    if (!isSameDay(dateTime, new Date(day))) return <></>

    let buttonHasToRender = true
    getOccupiedIntervals(steps, day).forEach((stepInterval) => {
      if (isWithinInterval(dateTime, stepInterval)) buttonHasToRender = false
    })

    if (!buttonHasToRender) return <></>

    const occupiedIntervals = getOccupiedIntervals(steps, day)
    const freeIntervals = getFreeIntervals(occupiedIntervals)

    const selectedInterval = freeIntervals.find((interval) =>
      isWithinInterval(dateTime, interval)
    )

    const dateTimeHours = getHours(dateTime)
    // Shift 1 minute, datetime with HH:00 overlaps next or previous interval
    const dateTimeStartOfHour = addMinutes(
      setMinutes(setHours(new Date(dateTime), dateTimeHours), 0),
      1
    )
    const dateTimeEndOfHour = subMinutes(
      setMinutes(setHours(new Date(dateTime), dateTimeHours + 1), 0),
      1
    )

    const start = new Date(
      isWithinInterval(dateTimeStartOfHour, selectedInterval)
        ? subMinutes(dateTimeStartOfHour, 1)
        : selectedInterval.start
    )
    const end = new Date(
      isWithinInterval(dateTimeEndOfHour, selectedInterval)
        ? addMinutes(dateTimeEndOfHour, 1)
        : selectedInterval.end
    )

    return renderAddStepButton({ start, end })
  }

  return (
    <View style={wrapperStyles}>
      <View style={dayColumnStyles}>
        <View style={dayStyles}>
          <Text style={{ fontWeight: 'bold' }}>{formatDate(day, 'EEE')}</Text>
          <Text>{formatDate(day, 'dd/MM')}</Text>
        </View>
      </View>
      <View style={stepsColumnStyles}>
        {steps.map((step, index) => (
          <>
            {index === 0 &&
              renderAddStep(addMinutes(new Date(step.startDateTime), -1), day)}
            <TripStep
              step={step}
              key={step.title + '_' + step.startDateTime}
              day={day}
            />
            {renderAddStep(addMinutes(new Date(step.endDateTime), 1), day)}
          </>
        ))}
        {steps.length === 0 &&
          renderAddStepButton({
            start: setHours(new Date(day), 0),
            end: setHours(new Date(day), 1),
          })}
      </View>
    </View>
  )
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
