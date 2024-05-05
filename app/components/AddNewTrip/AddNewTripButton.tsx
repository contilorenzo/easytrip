import React from 'react'
import { Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'

const AddNewTripButton = ({ isFirstTrip, navigation }) => {
  const handlePress = () => navigation.navigate('New-trip')

  return (
    <TouchableOpacity style={wrapperStyles} onPress={handlePress}>
      <Text style={textStyles}>
        {t(
          isFirstTrip
            ? TranslationsKeys.addFirstTrip
            : TranslationsKeys.addNewTrip
        )}
      </Text>
      <Ionicons name="add" style={iconStyle} size={20} />
    </TouchableOpacity>
  )
}

interface Props {
  isFirstTrip: boolean
}

const wrapperStyles: ViewStyle = {
  borderRadius: 10,
  backgroundColor: 'tomato',
  padding: 10,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  shadowColor: 'lightgray',
  shadowOffset: {
    width: 3,
    height: 3,
  },
  shadowOpacity: 0.5,
}

const textStyles: TextStyle = {
  color: 'white',
  display: 'flex',
  fontWeight: '600',
}

const iconStyle: TextStyle = {
  color: 'white',
  display: 'flex',
}

export default AddNewTripButton
