import { ViewStyle, Text, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useState } from 'react'

const DateTimeField = ({
  label,
  value,
  mode = 'date',
  onChange,
  minuteInterval,
  minDate
}: Props) => {
  const [date, setDate] = useState(new Date())

  const handleDateChange = (_, selectedDate) => {
    const currentDate = selectedDate
    setDate(currentDate)

    if (onChange) onChange(currentDate)
  }

  return (
    <View style={wrapperStyles}>
      {label && <Text style={{ fontWeight: '800' }}>{label}</Text>}
      <DateTimePicker
        value={value ?? date}
        mode={mode}
        onChange={handleDateChange}
        minuteInterval={minuteInterval ?? 1}
        minimumDate={minDate}
      />
    </View>
  )
}

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
  flexDirection: 'row',
  gap: 5,
  justifyContent: 'space-between',
}

export default DateTimeField

interface Props {
  label?: string
  value?: Date
  mode?: 'date' | 'time' | 'datetime'
  onChange?: (date: Date) => void
  minuteInterval?: number
  minDate?: Date
}
