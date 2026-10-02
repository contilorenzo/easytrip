import {
  ViewStyle,
  Text,
  View,
  TouchableOpacity,
  TextStyle,
} from 'react-native'
import { Option } from '../common/types'
import { Ionicons } from '@expo/vector-icons'

// Scelta singola a "pillole": più opzioni vanno a capo invece di restringersi
const RadioField = ({
  label,
  value,
  onChange = defaultOnChange,
  options,
  segmented = false,
}: Props) => {
  return (
    <View style={wrapperStyles}>
      {label && <Text style={labelStyles}>{label}</Text>}
      <View style={segmented ? segmentedContainerStyles : selectStyles}>
        {Array.isArray(options) &&
          options.length > 0 &&
          options.map((option) => {
            const isSelected = option.value === value
            return (
              <TouchableOpacity
                style={[segmented ? segmentedOptionStyles : optionStyles, isSelected && (segmented ? segmentedSelectedStyles : optionSelectedStyles)]}
                onPress={() => onChange(isSelected ? undefined : option.value)}
                activeOpacity={0.8}
                key={option.value}
              >
                {option?.icon && (
                  <Ionicons
                    name={option.icon}
                    size={17}
                    color={isSelected ? '#FFFFFF' : '#6B7280'}
                  />
                )}
                <Text
                  numberOfLines={1}
                  style={[textStyles, isSelected && textSelectedStyles]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            )
          })}
      </View>
    </View>
  )
}

const defaultOnChange = (_value: any) => {}

const wrapperStyles: ViewStyle = {
  gap: 8,
}

const labelStyles: TextStyle = {
  fontSize: 11.5,
  fontWeight: '800',
  color: '#6B7280',
  letterSpacing: 0.4,
  textTransform: 'uppercase',
}

const selectStyles: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
}

const optionStyles: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#F3F4F6',
  borderRadius: 14,
  paddingHorizontal: 12,
  paddingVertical: 9,
}

// Versione a tutta larghezza: opzioni di larghezza uguale dentro un'unica barra
const segmentedContainerStyles: ViewStyle = {
  flexDirection: 'row',
  backgroundColor: '#F3F4F6',
  borderRadius: 14,
  padding: 3,
}

const segmentedOptionStyles: ViewStyle = {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingVertical: 10,
  borderRadius: 11,
}

const segmentedSelectedStyles: ViewStyle = {
  backgroundColor: 'tomato',
}

const optionSelectedStyles: ViewStyle = {
  backgroundColor: 'tomato',
}

const textStyles: TextStyle = {
  color: '#4B5563',
  fontSize: 13,
  fontWeight: '700',
}

const textSelectedStyles: TextStyle = {
  color: '#FFFFFF',
}

export default RadioField

interface Props {
  label?: string
  value?: string
  onChange?: (value: string | undefined) => void
  options: Option[]
  // Opzioni di larghezza uguale che occupano tutta la riga
  segmented?: boolean
}
