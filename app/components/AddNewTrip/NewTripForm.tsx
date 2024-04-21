import { View, ViewStyle } from 'react-native'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import TextField from '../FormElements/TextField'

const NewTripForm = () => {
  return (
    <View style={wrapperStyles}>
      <TextField
        label={t(TranslationsKeys.trip_city)}
        onChange={(value) => console.log('overrided', value)}
      />
      <TextField
        label={t(TranslationsKeys.trip_country)}
        onChange={(value) => console.log('overrided', value)}
      />
    </View>
  )
}

const wrapperStyles: ViewStyle = {
  gap: 10,
}

export default NewTripForm
