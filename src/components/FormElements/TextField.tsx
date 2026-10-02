import { ViewStyle, TextInput, Text, View, TextStyle } from 'react-native'

const TextField = ({
  label,
  value,
  onChange = defaultOnChange,
  placeholder,
  style,
}: Props) => {
  return (
    <View style={wrapperStyles}>
      {label && <Text style={labelStyles}>{label}</Text>}
      <TextInput
        style={[inputStyles, style]}
        onChangeText={onChange}
        value={value ?? ''}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  )
}

const defaultOnChange = (_value: string) => {}

const labelStyles: TextStyle = {
  fontSize: 11.5,
  fontWeight: '800',
  color: '#6B7280',
  letterSpacing: 0.4,
  textTransform: 'uppercase',
}

const inputStyles: TextStyle = {
  backgroundColor: '#F3F4F6',
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 14,
  fontSize: 15,
  color: '#111827',
  fontWeight: '600',
  minHeight: 48,
}

const wrapperStyles: ViewStyle = {
  gap: 6,
}

export default TextField

interface Props {
  label?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  style?: TextStyle
}
