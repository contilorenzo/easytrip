import { View, ViewStyle } from 'react-native'
import { TripStep as TripStepType } from '../TripSteps/types'
import { Trip } from '../../TripsList/types'
import { eachDayOfInterval, format, interval } from 'date-fns'
import DaySteps from './DaySteps/DaySteps'
import { useTripsContext } from '../../../state/TripsContext'

const TripSteps = ({ steps, navigation }: Props) => {
  const trip = useTripsContext().currentTrip

  const getStepsByDay = (): { [key: string]: TripStepType<any>[] } => {
    const stepsByDay = {}

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
        stepsByDay[day] = [...stepsByDay?.[day], step]
      })
    })

    return stepsByDay
  }

  const renderSteps = (): React.ReactNode => {
    const stepsByDay = Object.entries(getStepsByDay())
    if (stepsByDay?.length === 0) return <></>

    return (
      <>
        {stepsByDay.map(([day, steps]) => (
          <DaySteps day={day} steps={steps} navigation={navigation} key={day} />
        ))}
      </>
    )
  }

  return <View style={wrapperStyles}>{renderSteps()}</View>
}

const formatDay = (date: Date) => format(date, 'EEEE - dd MMMM yyyy')

interface Props {
  steps: TripStepType<any>[]
  navigation: any
}

export default TripSteps

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  marginTop: 20,
  rowGap: 20,
}
