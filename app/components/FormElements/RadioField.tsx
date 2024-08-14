import {
  ViewStyle,
  Text,
  View,
  TouchableOpacity,
  TextStyle,
} from 'react-native'
import { Option } from '../common/types'
import { Ionicons } from '@expo/vector-icons'

const RadioField = ({
  label,
  value,
  onChange = defaultOnChange,
  options,
}: Props) => {
  const getSelectedStyles = (option: Option) => {
    const isOptionSelected = option.value === value

    return isOptionSelected
      ? {
          view: { backgroundColor: 'tomato', borderColor: 'tomato' },
          text: { color: 'white' },
        }
      : {}
  }

  return (
    <View style={wrapperStyles}>
      {label && <Text style={{ fontWeight: '800' }}>{label}</Text>}
      <View style={selectStyles}>
        {Array.isArray(options) &&
          options.length > 0 &&
          options.map((option) => (
            <TouchableOpacity
              style={{ ...optionStyles, ...getSelectedStyles(option).view }}
              onPress={() => onChange(option.value)}
              key={option.value}
            >
              {option?.icon && (
                <Ionicons
                  name={option.icon}
                  size={20}
                  style={{ ...textStyles, ...getSelectedStyles(option).text }}
                />
              )}
              <Text
                numberOfLines={1}
                style={{ ...textStyles, ...getSelectedStyles(option).text }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
      </View>
    </View>
  )
}

const defaultOnChange = (value) => console.log(value)

const wrapperStyles: ViewStyle = {
  gap: 5,
}

const selectStyles: ViewStyle = {
  display: 'flex',
  flexDirection: 'row',
  gap: 4,
  justifyContent: 'space-evenly',
}

const optionStyles: ViewStyle = {
  alignItems: 'center',
  borderColor: 'lightgray',
  borderRadius: 8,
  borderWidth: 1,
  display: 'flex',
  flex: 1,
  justifyContent: 'center',
  padding: 4,
}

const textStyles: TextStyle = {
  color: 'rgba(0,0,0,0.7)',
  fontWeight: 'bold',
}

export default RadioField

interface Props {
  label?: string
  value?: string
  onChange?: (value: string) => void
  options: Option[]
}
