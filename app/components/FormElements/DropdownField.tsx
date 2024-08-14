import { ViewStyle, View, Text } from 'react-native'
import {
  AutocompleteDropdown,
  AutocompleteDropdownItem,
} from 'react-native-autocomplete-dropdown'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'

const DropdownField = ({
  label,
  onChange = defaultOnChange,
  options,
}: Props) => {
  return (
    <View style={wrapperStyles}>
      {label && <Text>{label}</Text>}
      <AutocompleteDropdown
        onSelectItem={onChange}
        dataSet={options}
        textInputProps={{
          placeholder: t(TranslationsKeys.trip_searchCountry),
          style: {
            backgroundColor: 'transparent',
            color: 'black',
          },
        }}
        inputContainerStyle={{
          backgroundColor: 'transparent',
          borderColor: 'lightgray',
          borderRadius: 0,
          borderWidth: 1,
        }}
        suggestionsListContainerStyle={{
          backgroundColor: 'white',
        }}
        suggestionsListTextStyle={{
          color: 'rgba(0,0,0,0.6)',
        }}
        emptyResultText={t(TranslationsKeys.noResults)}
      />
    </View>
  )
}

const defaultOnChange = (value) => console.log(value)

const wrapperStyles: ViewStyle = {
  gap: 5,
}

export default DropdownField

interface Props {
  label?: string
  value?: string
  onChange?: (value: any) => void
  options: AutocompleteDropdownItem[]
}
