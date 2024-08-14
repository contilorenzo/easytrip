import {
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import { StepType, TripStep, VEHICLES } from '../types'
import { Ionicons } from '@expo/vector-icons'
import { primaryCtaStyles } from '../../../common/db/styles/buttons'
import { t } from '../../../../translations'
import { TranslationsKeys } from '../../../../translations/types'
import { ROUTES } from '../../../common/db/routes'
import TextField from '../../../FormElements/TextField'
import DateTimeField from '../../../FormElements/DateTimeField'
import { useEffect, useState } from 'react'
import { addStep } from '../../../common/db/utils'
import {
  addHours,
  addMinutes,
  isAfter,
  isSameDay,
  roundToNearestMinutes,
} from 'date-fns'
import RadioField from '../../../FormElements/RadioField'
import { useTripsContext } from '../../../../state/TripsContext'
import { getVehicleIcon } from '../TripStep/StepTypes/JourneyStep'
import { getStepTypeIcon } from '../TripStep/StepTypes/DefaultStep'

const AddStep = ({ navigation, day }: Props) => {
  const trip = useTripsContext().currentTrip

  const isFormValid = () =>
    title !== '' && !!type && !!startDateTime && !!endDateTime

  const [title, setTitle] = useState('')
  const [type, setType] = useState(StepType.JOURNEY)
  const [vehicle, setVehicle] = useState(VEHICLES.CAR)

  const roundedDateTime = () => {
    let date: Date = new Date(day ?? trip.startDate)

    if (Array.isArray(trip.steps) && trip.steps.length > 0) {
      const lastStep: TripStep<any> = trip.steps[trip.steps.length - 1]

      if (isSameDay(new Date(lastStep.endDateTime), new Date(day))) {
        date = new Date(lastStep.endDateTime)
      }
    }

    return roundToNearestMinutes(date, {
      nearestTo: 10,
    })
  }
  const [startDateTime, setStartDateTime] = useState(roundedDateTime())
  const [endDateTime, setEndDateTime] = useState(addHours(roundedDateTime(), 1))

  const context = useTripsContext()

  const addNewStep = async () => {
    const stepData: TripStep<any> = {
      title,
      type,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      extraData: {
        ...(type === StepType.JOURNEY && { vehicle }),
      },
    }

    await addStep(stepData, context)
    navigation.navigate(ROUTES.TRIP_DETAILS)
  }

  useEffect(() => {
    if (isAfter(startDateTime, endDateTime))
      setEndDateTime(addHours(startDateTime, 1))
  }, [startDateTime])

  return (
    <View style={wrapperStyles}>
      <Text style={headerTextStyles}>
        {t(TranslationsKeys.trip_tripTo)}{' '}
        <Text style={{ fontWeight: 'bold' }}>{trip.city}</Text>
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
            label: t(TranslationsKeys[`step_type_${type}`]),
            icon: getStepTypeIcon(type),
          }))}
        />
        {type === StepType.JOURNEY && (
          <RadioField
            label={t(TranslationsKeys.trip_step_vehicle)}
            value={vehicle}
            onChange={(vehicle) => setVehicle(vehicle as VEHICLES)}
            options={Object.values(VEHICLES).map((vehicle) => ({
              value: vehicle,
              label: t(TranslationsKeys[`vehicle_${vehicle}`]),
              icon: getVehicleIcon(vehicle),
            }))}
          />
        )}
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
          minDate={addMinutes(startDateTime, 10)}
        />
      </View>
      <TouchableOpacity
        onPress={addNewStep}
        disabled={!isFormValid()}
        style={{ ...primaryCtaStyles.button, marginTop: 30 }}
      >
        <Text style={primaryCtaStyles.text}>{t(TranslationsKeys.confirm)}</Text>
        <Ionicons name="save" style={primaryCtaStyles.icon} />
      </TouchableOpacity>
    </View>
  )
}

interface Props {
  navigation: any
  day: string
}

export default AddStep

const wrapperStyles: ViewStyle = {
  width: '100%',
}

const formStyles: ViewStyle = {
  display: 'flex',
  flexDirection: 'column',
  rowGap: 20,
}

const headerTextStyles: TextStyle = {
  fontSize: 20,
  marginBottom: 40,
  marginTop: 40,
  textAlign: 'center',
  width: '100%',
}
