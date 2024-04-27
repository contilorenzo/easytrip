import { View, ViewStyle } from 'react-native'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import TextField from '../FormElements/TextField'
import DateTimeField from '../FormElements/DateTimeField'
import { useState } from 'react'
import { NewTrip } from '../TripsList/types'
import { Button } from 'react-native'

const today = new Date()
const oneWeekFromToday = new Date(Date.now() + 604800000);

const NewTripForm = () => {
  const [country, setCountry] = useState<string>()
  const [city, setCity] = useState<string>()
  const [startDate, setStartDate] = useState<Date>(today)
  const [endDate, setEndDate] = useState<Date>(oneWeekFromToday)

  const isFormValid = !!country && !!city && !!startDate && !!endDate

  return (
    <View style={wrapperStyles}>
      <TextField
        label={t(TranslationsKeys.trip_country)}
        value={country}
        onChange={setCountry}
      />
      <TextField
        label={t(TranslationsKeys.trip_city)}
        value={city}
        onChange={setCity}
      />
      <DateTimeField
        label={t(TranslationsKeys.trip_startDate)}
        value={today}
        onChange={setStartDate}
      />
      <DateTimeField
        label={t(TranslationsKeys.trip_endDate)}
        value={oneWeekFromToday}
        onChange={setEndDate}
      />
      <Button
        onPress={() => createTrip({ country, city, startDate, endDate })}
        disabled={!isFormValid}
        title={t(TranslationsKeys.trip_addTrip)}
      />
    </View>
  )
}

const createTrip = (trip: NewTrip) => {
  alert(JSON.stringify(trip))
}

const wrapperStyles: ViewStyle = {
  gap: 10,
}

export default NewTripForm
