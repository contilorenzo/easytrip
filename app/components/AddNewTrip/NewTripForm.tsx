import { View, ViewStyle } from 'react-native'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import TextField from '../FormElements/TextField'
import DateTimeField from '../FormElements/DateTimeField'
import { useState } from 'react'
import { NewTrip } from '../TripsList/types'
import { Button } from 'react-native'
import { addTrip } from '../common/db/utils'
import { useTripsContext } from '../../state/TripsContext'

const today = new Date()
const oneWeekFromToday = new Date(Date.now() + 604800000)

const NewTripForm = ({ navigation }) => {
  const [country, setCountry] = useState<string>()
  const [city, setCity] = useState<string>()
  const [startDate, setStartDate] = useState<Date>(today)
  const [endDate, setEndDate] = useState<Date>(oneWeekFromToday)

  const context = useTripsContext()

  const isFormValid = !!country && !!city && !!startDate && !!endDate

  const createTrip = (trip: NewTrip) => {
    addTrip(trip, context)
  }

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
        value={startDate}
        onChange={setStartDate}
      />
      <DateTimeField
        label={t(TranslationsKeys.trip_endDate)}
        value={endDate}
        onChange={setEndDate}
      />
      <Button
        onPress={() => {
          createTrip({
            country,
            city,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          })
          navigation.goBack()
        }}
        disabled={!isFormValid}
        title={t(TranslationsKeys.trip_addTrip)}
      />
    </View>
  )
}

const wrapperStyles: ViewStyle = {
  gap: 10,
}

export default NewTripForm
