import { ViewStyle, TextInput, Text, View } from 'react-native'

const TextField = ({ label, value, onChange }: Props) => {
  return (
    <View style={wrapperStyles}>
      {label && <Text>{label}</Text>}
      <TextInput
        style={inputStyles}
        onChangeText={onChange ?? defaultOnChange}
        value={value ?? ''}
      />
    </View>
  )
}

const defaultOnChange = (value) => console.log(value)

const inputStyles: ViewStyle = {
  borderColor: 'lightgray',
  borderWidth: 1,
  padding: 10,
}
const wrapperStyles: ViewStyle = {
  gap: 5,
}

export default TextField

interface Props {
  label?: string
  value?: string
  onChange?: (value: string) => void
}
