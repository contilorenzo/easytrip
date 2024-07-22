import { TouchableOpacity, View, ViewStyle } from 'react-native'
import { Text } from 'react-native'
import { TripStep as TripStepType } from '../TripSteps/types'
import TripStep from './TripStep/TripStep'
import { TranslationsKeys } from '../../../translations/types'
import { t } from '../../../translations'
import { primaryCtaStyles } from '../../common/db/styles/buttons'
import { Trip } from '../../TripsList/types'
import { Ionicons } from '@expo/vector-icons'
import { ROUTES } from '../../common/db/routes'

const TripSteps = ({ steps, navigation, trip }: Props) => {
  const handleAddStepClick = () => {
    navigation.navigate(ROUTES.ADD_STEP, { trip })
  }

  return (
    <View style={wrapperStyles}>
      {steps &&
        steps.length > 0 &&
        steps.map((step) => <TripStep step={step} key={step.title} />)}
      <TouchableOpacity
        onPress={handleAddStepClick}
        style={primaryCtaStyles.button}
      >
        <Text style={primaryCtaStyles.text}>
          {t(TranslationsKeys.trip_addStep)}
        </Text>
        <Ionicons name="add" style={primaryCtaStyles.icon} size={20} />
      </TouchableOpacity>
    </View>
  )
}

interface Props {
  steps: TripStepType<any>[]
  trip: Trip
  navigation: any
}

export default TripSteps

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  marginTop: 20,
  rowGap: 8,
}
