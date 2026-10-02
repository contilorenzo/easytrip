import { ViewStyle, TextStyle, Text, View, Platform, TouchableOpacity } from 'react-native'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Ionicons } from '@expo/vector-icons'

const DateTimeField = ({
  label,
  value,
  mode = 'date',
  onChange,
  minuteInterval,
  minDate
}: Props) => {
  const [internalDate, setInternalDate] = useState<Date>(new Date())
  const currentDate = value ?? internalDate

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (!selectedDate) return
    setInternalDate(selectedDate)
    if (onChange) onChange(selectedDate)
  }

  const openAndroidDatePicker = () => {
    if (Platform.OS !== 'android') return
    DateTimePickerAndroid.open({
      value: currentDate,
      mode: 'date',
      minimumDate: minDate,
      onChange: (event: any, selectedDate?: Date) => {
        if (event.type === 'set' && selectedDate) {
          const newDate = new Date(selectedDate)
          if (mode === 'datetime') {
            newDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0)
          }
          setInternalDate(newDate)
          if (onChange) onChange(newDate)
        }
      },
    })
  }

  const openAndroidTimePicker = () => {
    if (Platform.OS !== 'android') return
    DateTimePickerAndroid.open({
      value: currentDate,
      mode: 'time',
      is24Hour: true,
      minuteInterval: (minuteInterval ?? 1) as any,
      onChange: (event: any, selectedTime?: Date) => {
        if (event.type === 'set' && selectedTime) {
          const newDate = new Date(currentDate)
          newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0)
          setInternalDate(newDate)
          if (onChange) onChange(newDate)
        }
      },
    })
  }

  const renderAndroidPicker = () => {
    if (mode === 'datetime') {
      return (
        <View style={androidPickerGroupStyles}>
          <TouchableOpacity
            style={androidButtonStyles}
            onPress={openAndroidDatePicker}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={15} color="#FF5A5F" />
            <Text style={androidButtonTextStyles}>
              {format(currentDate, 'd MMM yyyy', { locale: it })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={androidButtonStyles}
            onPress={openAndroidTimePicker}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={15} color="#FF5A5F" />
            <Text style={androidButtonTextStyles}>
              {format(currentDate, 'HH:mm')}
            </Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (mode === 'time') {
      return (
        <TouchableOpacity
          style={androidButtonStyles}
          onPress={openAndroidTimePicker}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={15} color="#FF5A5F" />
          <Text style={androidButtonTextStyles}>
            {format(currentDate, 'HH:mm')}
          </Text>
        </TouchableOpacity>
      )
    }

    return (
      <TouchableOpacity
        style={androidButtonStyles}
        onPress={openAndroidDatePicker}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={15} color="#FF5A5F" />
        <Text style={androidButtonTextStyles}>
          {format(currentDate, 'd MMM yyyy', { locale: it })}
        </Text>
      </TouchableOpacity>
    )
  }

  const DateTimePickerComponent = DateTimePicker as any

  return (
    <View style={wrapperStyles}>
      {label && <Text style={labelStyles}>{label}</Text>}
      {Platform.OS === 'android' ? (
        renderAndroidPicker()
      ) : (
        <DateTimePickerComponent
          value={currentDate}
          mode={mode}
          onChange={handleDateChange}
          minuteInterval={minuteInterval ?? 1}
          minimumDate={minDate}
          themeVariant="light"
          textColor="#111827"
          accentColor="#FF5A5F"
        />
      )}
    </View>
  )
}

// Etichetta sopra e selettori sotto: in orizzontale su Android uscivano dal riquadro
const wrapperStyles: ViewStyle = {
  alignItems: 'flex-start',
  flexDirection: 'column',
  gap: 6,
  backgroundColor: '#F3F4F6',
  borderRadius: 14,
  paddingHorizontal: 12,
  paddingVertical: 10,
}

const labelStyles: TextStyle = {
  fontSize: 11.5,
  fontWeight: '800',
  color: '#6B7280',
  letterSpacing: 0.4,
  textTransform: 'uppercase',
}

const androidPickerGroupStyles: ViewStyle = {
  flexDirection: 'row',
  gap: 8,
  alignItems: 'center',
  alignSelf: 'stretch',
}

const androidButtonStyles: ViewStyle = {
  flexGrow: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  paddingVertical: 7,
  paddingHorizontal: 10,
  gap: 6,
}

const androidButtonTextStyles: TextStyle = {
  color: '#111827',
  fontSize: 13.5,
  fontWeight: '700',
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
