import { Text, View, ViewStyle } from 'react-native'
import TripStep from '../TripStep/TripStep'
import { TripStep as TripStepType } from '../types'
import { format } from 'date-fns'

const DaySteps = ({ day, steps }: Props) => {
  return (
    <View style={wrapperStyles}>
      <View style={dayStyles}>
        <Text style={{ fontWeight: 'bold' }}>{formatDate(day, 'EEE')}</Text>
        <Text>{formatDate(day, 'dd/MM')}</Text>
      </View>
      <View style={stepsColumnStyles}>
        {steps.map((step) => (
          <TripStep step={step} key={step.title} day={day} />
        ))}
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
  width: '82%',
}
