import { useState } from 'react'
import { ViewStyle, View, Text, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  AutocompleteDropdown,
  AutocompleteDropdownItem,
} from 'react-native-autocomplete-dropdown'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import CountryFlag from '../common/CountryFlag/CountryFlag'

const DropdownField = ({
  label,
  onChange = defaultOnChange,
  options,
  initialId,
}: Props) => {
  const initialItem = initialId ? options?.find((option) => String(option.id) === initialId) ?? null : null
  const [selected, setSelected] = useState<AutocompleteDropdownItem | null>(initialItem)

  const handleSelect = (item: AutocompleteDropdownItem | null) => {
    setSelected(item)
    onChange(item)
  }

  return (
    <View style={wrapperStyles}>
      {label && <Text style={labelStyles}>{label}</Text>}
      <AutocompleteDropdown
        onSelectItem={handleSelect}
        initialValue={initialItem ? { id: String(initialItem.id) } : undefined}
        dataSet={options}
        showChevron={false}
        // Bandiera del paese scelto a sinistra, lente di ricerca se non c'è ancora una scelta
        LeftComponent={
          <View style={leftIconStyles}>
            {selected?.id ? (
              <CountryFlag countryCode={String(selected.id)} height={16} width={22} borderRadius={4} resolution="w80" />
            ) : (
              <Ionicons name="search" size={17} color="#9CA3AF" />
            )}
          </View>
        }
        renderItem={(item) => (
          <View style={itemStyles}>
            <CountryFlag countryCode={String(item.id)} height={16} width={22} borderRadius={4} resolution="w80" />
            <Text style={itemTextStyles} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        )}
        textInputProps={{
          placeholder: t(TranslationsKeys.trip_searchCountry),
          placeholderTextColor: '#9CA3AF',
          style: {
            backgroundColor: 'transparent',
            color: '#111827',
            fontSize: 15,
            fontWeight: '600',
          },
        }}
        inputContainerStyle={{
          backgroundColor: '#F3F4F6',
          borderRadius: 14,
          paddingHorizontal: 4,
          minHeight: 48,
        }}
        suggestionsListContainerStyle={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 14,
          elevation: 8,
        }}
        emptyResultText={t(TranslationsKeys.noResults)}
      />
    </View>
  )
}

const defaultOnChange = (_value: any) => {}

const labelStyles = {
  fontSize: 11.5,
  fontWeight: '800' as const,
  color: '#6B7280',
  letterSpacing: 0.4,
  textTransform: 'uppercase' as const,
}

const wrapperStyles: ViewStyle = {
  gap: 6,
}

const leftIconStyles: ViewStyle = {
  width: 40,
  alignItems: 'center',
  justifyContent: 'center',
}

const itemStyles: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingVertical: 12,
  paddingHorizontal: 16,
}

const itemTextStyles = {
  flex: 1,
  color: '#1F2937',
  fontSize: 14.5,
  fontWeight: '600' as const,
}

export default DropdownField

interface Props {
  label?: string
  value?: string
  onChange?: (value: any) => void
  options: AutocompleteDropdownItem[]
  // Paese preselezionato (id del paese)
  initialId?: string
}
