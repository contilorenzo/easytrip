import React from 'react'
import { Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { t } from '../../translations'
import { TranslationsKeys } from '../../translations/types'
import { primaryCtaStyles } from '../common/db/styles/buttons'
import { ROUTES } from '../common/db/routes'

const AddNewTripButton = ({ isFirstTrip, navigation }: Props) => {
  const handlePress = () => navigation.navigate(ROUTES.NEW_TRIP)

  return (
    <TouchableOpacity style={primaryCtaStyles.button} onPress={handlePress}>
      <Text style={primaryCtaStyles.text}>
        {t(
          isFirstTrip
            ? TranslationsKeys.addFirstTrip
            : TranslationsKeys.addNewTrip
        )}
      </Text>
      <Ionicons name="add" style={primaryCtaStyles.icon} size={20} />
    </TouchableOpacity>
  )
}

interface Props {
  isFirstTrip: boolean
  navigation: any
}

export default AddNewTripButton
