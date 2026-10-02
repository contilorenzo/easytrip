import React, { useRef } from 'react'
import { View, ViewStyle, Text, Animated } from 'react-native'
import { StepType, TripStep as TripStepType } from '../TripSteps/types'
import { Trip } from '../../TripsList/types'
import { eachDayOfInterval, format, interval } from 'date-fns'
import DaySteps from './DaySteps/DaySteps'
import TripStep from './TripStep/TripStep'
import { useTripsContext } from '../../../state/TripsContext'

const TripSteps = ({ steps, onStepPress, selectedDay = 'ALL', selectedStep, scrollY, onStepLayout }: Props) => {
  const trip = useTripsContext().currentTrip
  const tripStepsY = useRef(0)
  const dayPositions = useRef<{ [day: string]: number }>({})
  const stepPositionsInDay = useRef<{ [key: string]: { step: TripStepType<any>; day: string; y: number } }>({})

  const updateAllStepPositions = () => {
    Object.values(stepPositionsInDay.current).forEach(({ step, day, y }) => {
      const dayY = dayPositions.current[day] ?? 0
      const totalY = tripStepsY.current + dayY + y
      onStepLayout?.(step, day, totalY)
    })
  }

  const handleStepLayoutInDay = (step: TripStepType<any>, day: string, stepY: number) => {
    const stepKey = `${day}_${step.title}_${step.startDateTime}`
    stepPositionsInDay.current[stepKey] = { step, day, y: stepY }
    const dayY = dayPositions.current[day] ?? 0
    onStepLayout?.(step, day, tripStepsY.current + dayY + stepY)
  }

  const handleDayLayout = (day: string, dayY: number) => {
    dayPositions.current[day] = dayY
    updateAllStepPositions()
  }

  const getStepsByDay = (): { [key: string]: TripStepType<any>[] } => {
    const stepsByDay: Record<string, TripStepType<any>[]> = {}

    const tripDays = eachDayOfInterval(
      interval(new Date(trip.startDate), new Date(trip.endDate))
    ).map((date) => formatDay(date))

    tripDays.forEach((day) => {
      stepsByDay[day] = []
    })

    steps?.forEach((step) => {
      const startDay = formatDay(new Date(step.startDateTime))
      const endDay = formatDay(new Date(step.endDateTime))

      const stepDays = eachDayOfInterval(interval(startDay, endDay)).map(
        (date) => formatDay(date)
      )

      stepDays.forEach((day) => {
        if (!stepsByDay[day]) {
          stepsByDay[day] = []
        }
        stepsByDay[day] = [...stepsByDay[day], step]
      })
    })

    return stepsByDay
  }

  const renderSteps = (): React.ReactNode => {
    let stepsByDay = Object.entries(getStepsByDay())
    
    if (selectedDay !== 'ALL') {
      stepsByDay = stepsByDay.filter(([day]) => day === selectedDay)
    }

    if (stepsByDay?.length === 0) return <></>

    return (
      <>
        {stepsByDay.map(([day, steps]) => (
          <DaySteps 
            day={day} 
            steps={steps} 
            key={day} 
            onStepPress={onStepPress} 
            selectedStep={selectedStep} 
            scrollY={scrollY}
            onDayLayout={(y) => handleDayLayout(day, y)}
            onStepLayout={(step, y) => handleStepLayoutInDay(step, day, y)}
          />
        ))}
      </>
    )
  }

  return (
    <View 
      style={wrapperStyles}
      onLayout={(e) => {
        tripStepsY.current = e.nativeEvent.layout.y
        updateAllStepPositions()
      }}
    >
      {renderSteps()}
    </View>
  )
}

const formatDay = (date: Date) => format(date, 'yyyy-MM-dd')

interface Props {
  steps: TripStepType<any>[]
  onStepPress?: (step: TripStepType<any>, day?: string) => void
  selectedDay?: string
  selectedStep?: any
  scrollY?: Animated.Value
  onStepLayout?: (step: TripStepType<any>, day: string, y: number) => void
}

export default TripSteps

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  marginTop: 2,
  rowGap: 8,
  width: '100%',
}
