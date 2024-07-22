import {
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import { StepType, TripStep } from '../types'
import { Ionicons } from '@expo/vector-icons'
import { Trip } from '../../../TripsList/types'
import { primaryCtaStyles } from '../../../common/db/styles/buttons'
import { t } from '../../../../translations'
import { TranslationsKeys } from '../../../../translations/types'
import { ROUTES } from '../../../common/db/routes'
import TextField from '../../../FormElements/TextField'
import DateTimeField from '../../../FormElements/DateTimeField'
import { useState } from 'react'
import { addStep } from '../../../common/db/utils'
import { addHours, roundToNearestMinutes } from 'date-fns'
import RadioField from '../../../FormElements/RadioField'

const AddStep = ({ trip, navigation }: Props) => {
  const isFormValid = true

  const [title, setTitle] = useState('')
  const [type, setType] = useState(StepType.JOURNEY)

  const roundedDateTime = roundToNearestMinutes(new Date(trip.startDate), {
    nearestTo: 10,
  })
  const [startDateTime, setStartDateTime] = useState(roundedDateTime)
  const [endDateTime, setEndDateTime] = useState(addHours(roundedDateTime, 1))
  const [extraData, setExtraData] = useState({})

  const addNewStep = async () => {
    const stepData: TripStep<any> = {
      title,
      type,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      extraData,
    }

    await addStep(stepData, trip)
    navigation.navigate(ROUTES.TRIP_DETAILS, { trip })
  }

  return (
    <View style={wrapperStyles}>
      <Text style={headerTextStyles}>
        Trip to <Text style={{ fontWeight: 'bold' }}>{trip.city}</Text>
      </Text>
      <View style={formStyles}>
        <TextField
          label={t(TranslationsKeys.trip_step_title)}
          value={title}
          onChange={setTitle}
        />
        <RadioField
          label={t(TranslationsKeys.trip_step_type)}
          value={type}
          onChange={(type) => setType(type as StepType)}
          options={Object.values(StepType).map((type) => ({
            value: type,
            label: type,
          }))}
        />
        <DateTimeField
          label={t(TranslationsKeys.trip_step_startDateTime)}
          mode="datetime"
          value={startDateTime}
          onChange={setStartDateTime}
          minuteInterval={10}
        />
        <DateTimeField
          label={t(TranslationsKeys.trip_step_endDateTime)}
          mode="datetime"
          value={endDateTime}
          onChange={setEndDateTime}
          minuteInterval={10}
        />
      </View>
      <TouchableOpacity
        onPress={addNewStep}
        disabled={!isFormValid}
        style={{ ...primaryCtaStyles.button, marginTop: 10 }}
      >
        <Text style={primaryCtaStyles.text}>{t(TranslationsKeys.confirm)}</Text>
        <Ionicons name="add-circle" style={primaryCtaStyles.icon} />
      </TouchableOpacity>
    </View>
  )
}

interface Props {
  trip: Trip
  navigation: any
}

export default AddStep

const wrapperStyles: ViewStyle = {
  width: '100%',
}

const formStyles: ViewStyle = {
  display: 'flex',
  flexDirection: 'column',
  rowGap: 10,
}

const headerTextStyles: TextStyle = {
  marginBottom: 10,
  fontSize: 20,
  textAlign: 'center',
  width: '100%',
}
