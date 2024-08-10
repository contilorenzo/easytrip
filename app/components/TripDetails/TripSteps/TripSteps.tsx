import { TouchableOpacity, View, ViewStyle } from 'react-native'
import { Text } from 'react-native'
import { TripStep as TripStepType } from '../TripSteps/types'
import TripStep from './TripStep/TripStep'
import { TranslationsKeys } from '../../../translations/types'
import { t } from '../../../translations'
import { primaryCtaStyles } from '../../common/db/styles/buttons'
import { Trip } from '../../TripsList/types'
import { Ionicons } from '@expo/vector-icons'
import { ROUTES } from '../../common/db/routes'
import { eachDayOfInterval, format, interval } from 'date-fns'
import DaySteps from './DaySteps/DaySteps'

const TripSteps = ({ steps, navigation, trip }: Props) => {
  const handleAddStepClick = () => {
    navigation.navigate(ROUTES.ADD_STEP, { trip })
  }

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
          <DaySteps day={day} steps={steps} />
        ))}
      </>
    )
  }

  return (
    <View style={wrapperStyles}>
      {steps && steps.length > 0 && renderSteps()}
      <TouchableOpacity
        onPress={handleAddStepClick}
        style={{ ...primaryCtaStyles.button, marginTop: 10 }}
      >
        <Text style={primaryCtaStyles.text}>
          {t(TranslationsKeys.trip_addStep)}
        </Text>
        <Ionicons name="add" style={primaryCtaStyles.icon} size={20} />
      </TouchableOpacity>
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
