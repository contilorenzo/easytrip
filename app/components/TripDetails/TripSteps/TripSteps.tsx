import { View, ViewStyle } from 'react-native'
import { TripStep as TripStepType } from '../TripSteps/types'
import { Trip } from '../../TripsList/types'
import { eachDayOfInterval, format, interval } from 'date-fns'
import DaySteps from './DaySteps/DaySteps'

const TripSteps = ({ steps, navigation, trip }: Props) => {
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

      stepsByDay[startDay] = [...stepsByDay?.[startDay], step]
      if (startDay === endDay) return

      stepsByDay[endDay] = [...stepsByDay?.[endDay], step]
    })

    return stepsByDay
  }

  const renderSteps = (): React.ReactNode => {
    const stepsByDay = Object.entries(getStepsByDay())
    if (stepsByDay?.length === 0) return <></>

    return (
      <>
        {stepsByDay.map(([day, steps]) => (
          <DaySteps
            day={day}
            steps={steps}
            navigation={navigation}
            trip={trip}
          />
        ))}
      </>
    )
  }

  return (
    <View style={wrapperStyles}>
      {steps && steps.length > 0 && renderSteps()}
    </View>
  )
}

const formatDay = (date) => format(date, 'EEEE - dd MMMM yyyy')

interface Props {
  steps: TripStepType<any>[]
  trip: Trip
  navigation: any
}

export default TripSteps

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  marginTop: 20,
  rowGap: 8,
}
