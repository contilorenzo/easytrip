import { Text, View, ViewStyle, TouchableOpacity } from 'react-native'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import TextField from '../FormElements/TextField'
import DateTimeField from '../FormElements/DateTimeField'
import { useState } from 'react'
import { NewTrip } from '../TripsList/types'
import { Button } from 'react-native'
import { addTrip } from '../common/db/utils'
import { useTripsContext } from '../../state/TripsContext'
import DropdownField from '../FormElements/DropdownField'
import { AutocompleteDropdownItem } from 'react-native-autocomplete-dropdown'
import { primaryCtaStyles } from '../common/db/styles/buttons'
import { Ionicons } from '@expo/vector-icons'

const today = new Date()
const oneWeekFromToday = new Date(Date.now() + 604800000)

const NewTripForm = ({ navigation }) => {
  const context = useTripsContext()

  const [country, setCountry] = useState<string>()
  const [city, setCity] = useState<string>()
  const [startDate, setStartDate] = useState<Date>(today)
  const [endDate, setEndDate] = useState<Date>(oneWeekFromToday)

  if (!context.countries) {
    getCountriesOptions().then((data) => {
      context.setCountries(data)
    })
  }

  const isFormValid = !!country && !!city && !!startDate && !!endDate

  const createTrip = (trip: NewTrip) => {
    addTrip(trip, context)
  }

  return context.countries ? (
    <View style={wrapperStyles}>
      <DropdownField
        label={t(TranslationsKeys.trip_country)}
        onChange={setCountry}
        options={context.countries}
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
      <TouchableOpacity
        style={{ ...primaryCtaStyles.button, marginTop: 20 }}
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
      >
        <Text style={primaryCtaStyles.text}>
          {t(TranslationsKeys.trip_addTrip)}
        </Text>
        <Ionicons name="save" style={primaryCtaStyles.icon} size={20} />
      </TouchableOpacity>
    </View>
  ) : (
    <></>
  )
}

const getCountriesOptions = async () => {
  const res = await fetch('https://flagcdn.com/it/codes.json')
  const countriesObj = await res.json()

  const countriesOptions: AutocompleteDropdownItem[] = Object.entries(
    countriesObj
  ).map(([key, value]) => ({
    id: key,
    title: value.toString() ?? '',
  }))

  return countriesOptions
}

const wrapperStyles: ViewStyle = {
  gap: 10,
}

export default NewTripForm
