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
import TextField from '../../../FormElements/TextField'
import DateTimeField from '../../../FormElements/DateTimeField'
import { useEffect, useState } from 'react'
import { addHours, addMinutes, isAfter } from 'date-fns'
import RadioField from '../../../FormElements/RadioField'
import { useTripsContext } from '../../../../state/TripsContext'
import { getVehicleIcon } from '../TripStep/StepTypes/JourneyStep'
import { getStepTypeIcon } from '../TripStep/StepTypes/DefaultStep'

const StepForm = ({ start, end, title, type, vehicle, onSubmit }: Props) => {
  const trip = useTripsContext().currentTrip

  const isFormValid = () =>
    _title !== '' && !!_type && !!startDateTime && !!endDateTime

  const [_title, setTitle] = useState<string>(title ?? '')
  const [_type, setType] = useState<StepType>(type ?? StepType.JOURNEY)
  const [_vehicle, setVehicle] = useState<VEHICLES>(vehicle ?? VEHICLES.CAR)
  const [startDateTime, setStartDateTime] = useState<Date>(start)
  const [endDateTime, setEndDateTime] = useState<Date>(end)

  useEffect(() => {
    if (isAfter(startDateTime, endDateTime))
      setEndDateTime(addHours(startDateTime, 1))
  }, [startDateTime])

  const getSubmitData = (): TripStep<any> => {
    return {
      title: _title,
      type: _type,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      extraData: {
        ...(_type === StepType.JOURNEY && { vehicle: _vehicle }),
      },
    }
  }

  return (
    <View style={wrapperStyles}>
      <Text style={headerTextStyles}>
        {t(TranslationsKeys.trip_tripTo)}{' '}
        <Text style={{ fontWeight: 'bold' }}>{trip.city}</Text>
      </Text>
      <View style={formStyles}>
        <TextField
          label={t(TranslationsKeys.trip_step_title)}
          value={_title}
          onChange={setTitle}
        />
        <RadioField
          label={t(TranslationsKeys.trip_step_type)}
          value={_type}
          onChange={(type) => setType(type as StepType)}
          options={Object.values(StepType).map((type) => ({
            value: type,
            label: t(TranslationsKeys[`step_type_${type}`]),
            icon: getStepTypeIcon(type),
          }))}
        />
        {_type === StepType.JOURNEY && (
          <RadioField
            label={t(TranslationsKeys.trip_step_vehicle)}
            value={_vehicle}
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
        onPress={() => onSubmit(getSubmitData())}
        disabled={!isFormValid()}
        style={{ ...primaryCtaStyles.button, marginTop: 30 }}
      >
        <Text style={primaryCtaStyles.text}>{t(TranslationsKeys.confirm)}</Text>
        <Ionicons name="save" style={primaryCtaStyles.icon} />
      </TouchableOpacity>
    </View>
  )
}

export default StepForm

export interface Props {
  start: Date
  end: Date
  title?: string
  type?: StepType
  vehicle?: VEHICLES
  onSubmit: (data: TripStep<any>) => void
}

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
