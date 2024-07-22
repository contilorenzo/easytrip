import { Text, TouchableOpacity, View, ViewStyle } from 'react-native'
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

const AddStep = ({ trip, navigation }: Props) => {
  const isFormValid = true

  const [title, setTitle] = useState('')
  const [type, setType] = useState(StepType.JOURNEY)
  const [startDateTime, setStartDateTime] = useState(new Date())
  const [endDateTime, setEndDateTime] = useState(new Date())
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
      <Text>
        Add a step for your trip to{' '}
        <Text style={{ fontWeight: 'bold' }}>{trip.city}</Text>
      </Text>
      <View>
        <TextField
          label={t(TranslationsKeys.trip_step_title)}
          value={title}
          onChange={setTitle}
        />
        <DateTimeField
          label={t(TranslationsKeys.trip_step_startDateTime)}
          mode="datetime"
          value={startDateTime}
          onChange={setStartDateTime}
        />
        <DateTimeField
          label={t(TranslationsKeys.trip_step_endDateTime)}
          mode="datetime"
          value={endDateTime}
          onChange={setEndDateTime}
        />
      </View>
      <Text>{title}</Text>
      <Text>{type}</Text>
      <Text>{startDateTime.toISOString()}</Text>
      <Text>{endDateTime.toISOString()}</Text>
      <TouchableOpacity
        onPress={addNewStep}
        disabled={!isFormValid}
        style={primaryCtaStyles.button}
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
