import { stepFont } from '../../../../utils/stepsFont'
import { STEP_TOOLTIP_SPACE } from '../stepTooltip'
import { canEdit } from '../../../../utils/tripRole'
import React, { useState } from 'react'
import {
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
  Animated,
  Platform,
} from 'react-native'
import TripStep from '../TripStep/TripStep'
import { StepType, TripStep as TripStepType } from '../types'
import { useTripsContext } from '../../../../state/TripsContext'
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
import { router } from 'expo-router'
import { addStep } from '../../../common/db/utils'
import { it } from 'date-fns/locale'

const getOccupiedIntervals = (steps: TripStepType<any>[], day: string) => {
  const occupiedIntervals: Interval[] = []

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

const DaySteps = ({ day, steps, onStepPress, selectedStep, scrollY, onDayLayout, onStepLayout }: Props) => {
  const context = useTripsContext()
  const trip = context.currentTrip
  // Chi ha accesso in sola lettura non può aggiungere tappe
  const editable = canEdit(trip)
  const [dayLayout, setDayLayout] = useState<{ y: number; height: number }>({ y: 0, height: 0 })

  const maxTranslate = Math.max(0, dayLayout.height - 54)
  const translateY = scrollY && maxTranslate > 0
    ? scrollY.interpolate({
        inputRange: [dayLayout.y, dayLayout.y + maxTranslate],
        outputRange: [0, maxTranslate],
        extrapolate: 'clamp',
      })
    : 0

  const handleAddStepClick = (start: Date, end: Date) => {
    router.push({
      pathname: ROUTES.ADD_STEP,
      params: { start: start.toISOString(), end: end.toISOString() },
    })
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

  const renderAddStepButton = (args: {
    hasLabel?: boolean
    iconSize?: number
    start: Date
    end: Date
  }) => (editable ? renderAddStepButtonBase(args) : null)

  const renderAddStepButtonBase = ({
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
        onPress={() => handleAddStepClick(start, end)}
        style={{
          ...addStepStyles,
          ...(steps.length > 0 && { minHeight: 0 }),
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
    if (!editable) return <></>
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
    <View 
      style={wrapperStyles}
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout
        setDayLayout({ y, height })
        onDayLayout?.(y)
      }}
    >
      <View style={dayColumnStyles}>
        <Animated.View style={[dayStyles, { transform: [{ translateY }] }]}>
          <Text style={{ fontWeight: '800', fontSize: stepFont(9.5), color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' }}>
            {formatDate(day, 'EEE')}
          </Text>
          <View style={dayBadgeStyles}>
            <Text style={{ fontWeight: '800', fontSize: stepFont(10.5), color: '#1E293B', textAlign: 'center' }}>
              {formatDate(day, 'dd/MM')}
            </Text>
          </View>
        </Animated.View>
      </View>
      <View style={stepsColumnStyles}>
        {steps.map((step, index) => (
          <View 
            key={step.title + '_' + step.startDateTime} 
            style={stepStyles}
            onLayout={(e) => {
              onStepLayout?.(step, e.nativeEvent.layout.y)
            }}
          >
            {index === 0 &&
              renderAddStep(addMinutes(new Date(step.startDateTime), -1), day)}
            <TripStep step={step} day={day} onStepPress={onStepPress} selectedStep={selectedStep} />
            {renderAddStep(addMinutes(new Date(step.endDateTime), 1), day)}
          </View>
        ))}
        {steps.length === 0 &&
          renderAddStepButton({
            start: setHours(new Date(day), 0),
            end: setHours(new Date(day), 1),
          })}
          
        {editable && steps.length > 0 && steps[steps.length - 1].type !== StepType.ACCOMODATION && (() => {
          const endOfDay = setHours(new Date(day), 23);
          const accommodations = (trip.steps || [])
            .filter(s => s.type === StepType.ACCOMODATION && s.extraData?.location)
            .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
          
          let currentAcc = [...accommodations].reverse().find(s => new Date(s.startDateTime).getTime() <= endOfDay.getTime());
          
          if (currentAcc) {
            return (
              <TouchableOpacity
                onPress={() => {
                  const currentDay = new Date(day)
                  
                  let newStart = new Date(currentDay)
                  newStart.setHours(22, 0, 0, 0)
                  
                  let newEnd = new Date(currentDay)
                  newEnd.setDate(newEnd.getDate() + 1)
                  newEnd.setHours(8, 0, 0, 0)
                  
                  let latestEndToday = new Date(currentDay)
                  latestEndToday.setHours(0, 0, 0, 0)

                  let earliestStartTomorrow = new Date(newEnd)
                  earliestStartTomorrow.setHours(23, 59, 59, 999)

                  trip.steps?.forEach(s => {
                    const stepStart = new Date(s.startDateTime)
                    const stepEnd = new Date(s.endDateTime)
                    
                    if (stepStart.getDate() === currentDay.getDate() && stepStart.getMonth() === currentDay.getMonth()) {
                      if (stepEnd > latestEndToday) latestEndToday = stepEnd
                    }
                    
                    if (stepStart.getDate() === newEnd.getDate() && stepStart.getMonth() === newEnd.getMonth()) {
                      if (stepStart < earliestStartTomorrow) earliestStartTomorrow = stepStart
                    }
                  })

                  if (latestEndToday > newStart) newStart = new Date(latestEndToday)
                  if (earliestStartTomorrow < newEnd) newEnd = new Date(earliestStartTomorrow)
                  if (newStart >= newEnd) newEnd = new Date(newStart.getTime() + 60 * 60000)

                  const newStep = {
                    title: currentAcc.title,
                    type: StepType.ACCOMODATION,
                    startDateTime: newStart.toISOString(),
                    endDateTime: newEnd.toISOString(),
                    extraData: {
                      arrivedBy: currentAcc.extraData?.arrivedBy || 'CAR',
                      ...(currentAcc.extraData?.location && { location: currentAcc.extraData.location }),
                    }
                  }

                  addStep(newStep as TripStepType<any>, context)
                }}
                style={returnAccStyles}
              >
                <Ionicons name="bed-outline" size={16} color="tomato" />
                <Text style={returnAccTextStyles}>
                  Ritorno all'ultimo alloggio
                </Text>
              </TouchableOpacity>
            )
          } else {
            return (
              <TouchableOpacity
                onPress={() => {
                  const currentDay = new Date(day)
                  
                  let newStart = new Date(currentDay)
                  newStart.setHours(22, 0, 0, 0)
                  
                  let newEnd = new Date(currentDay)
                  newEnd.setDate(newEnd.getDate() + 1)
                  newEnd.setHours(8, 0, 0, 0)
                  
                  let latestEndToday = new Date(currentDay)
                  latestEndToday.setHours(0, 0, 0, 0)

                  trip.steps?.forEach(s => {
                    const stepStart = new Date(s.startDateTime)
                    const stepEnd = new Date(s.endDateTime)
                    if (stepStart.getDate() === currentDay.getDate() && stepStart.getMonth() === currentDay.getMonth()) {
                      if (stepEnd > latestEndToday) latestEndToday = stepEnd
                    }
                  })

                  if (latestEndToday > newStart) newStart = new Date(latestEndToday)
                  
                  router.push({
                    pathname: ROUTES.ADD_STEP,
                    // type: il form si apre già sul tipo "alloggio"
                    params: { start: newStart.toISOString(), end: newEnd.toISOString(), type: StepType.ACCOMODATION },
                  })
                }}
                style={addAccStyles}
              >
                <Ionicons name="bed-outline" size={16} color="#888" />
                <Text style={addAccTextStyles}>
                  Aggiungi alloggio
                </Text>
              </TouchableOpacity>
            )
          }
        })()}
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
  onStepPress?: (step: TripStepType<any>, day?: string) => void
  selectedStep?: any
  scrollY?: Animated.Value
  onDayLayout?: (y: number) => void
  onStepLayout?: (step: TripStepType<any>, y: number) => void
}

const wrapperStyles: ViewStyle = {
  columnGap: 6,
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  paddingBottom: 4,
  alignItems: 'stretch',
}

const dayColumnStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'flex-start',
  paddingTop: 4,
  width: Platform.OS === 'ios' ? '19%' : '16%',
  borderRightColor: '#E2E8F0',
  borderRightWidth: 1.5,
  alignSelf: 'stretch',
}

const dayStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
}

const dayBadgeStyles: ViewStyle = {
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 4,
  paddingVertical: 1.5,
  borderRadius: 5,
  marginTop: 2,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 1.5,
  elevation: 1,
  alignItems: 'center',
  justifyContent: 'center',
}

// La colonna occupa lo spazio rimasto accanto ai giorni, allargata a sinistra per fare posto al tooltip delle tappe
const stepsColumnStyles: ViewStyle = {
  gap: 4,
  height: '100%',
  flex: 1,
  minWidth: 0,
  marginLeft: -STEP_TOOLTIP_SPACE,
  paddingLeft: STEP_TOOLTIP_SPACE,
}

const stepStyles: ViewStyle = {
  display: 'flex',
  gap: 4,
  marginLeft: -STEP_TOOLTIP_SPACE,
  paddingLeft: STEP_TOOLTIP_SPACE,
}

const addStepStyles: ViewStyle = {
  alignItems: 'center',
  columnGap: 5,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  minHeight: 24,
  paddingVertical: 2,
  paddingHorizontal: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#CBD5E1',
  borderStyle: 'dashed',
  backgroundColor: 'rgba(255, 255, 255, 0.65)',
  width: '96%',
  alignSelf: 'center',
}

const addStepLabelStyle: TextStyle = {
  color: '#64748B',
  fontSize: stepFont(10.5),
  fontWeight: '600',
}

const addStepIconStyle: TextStyle = {
  color: '#94A3B8',
  fontSize: stepFont(12),
}

const returnAccStyles: ViewStyle = {
  alignItems: 'center',
  columnGap: 5,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  minHeight: 26,
  paddingVertical: 3,
  paddingHorizontal: 10,
  width: '96%',
  alignSelf: 'center',
  backgroundColor: '#FFF5F5',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: 'rgba(255, 99, 71, 0.25)',
  marginTop: 4,
}

const returnAccTextStyles: TextStyle = {
  color: 'tomato',
  fontSize: stepFont(10.5),
  fontWeight: '700',
}

const addAccStyles: ViewStyle = {
  alignItems: 'center',
  columnGap: 5,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  minHeight: 26,
  paddingVertical: 3,
  paddingHorizontal: 10,
  width: '96%',
  alignSelf: 'center',
  backgroundColor: '#F8FAFC',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  marginTop: 4,
}

const addAccTextStyles: TextStyle = {
  color: '#475569',
  fontSize: stepFont(10.5),
  fontWeight: '700',
}
