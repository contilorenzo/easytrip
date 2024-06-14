import { Text, View, ViewStyle } from "react-native"
import { TripStep } from "../../../../TripsList/types"
import { Ionicons } from '@expo/vector-icons'
import { getDuration } from "./utils"

const VisitStep = ({ step }: Props): React.ReactNode => {
  return (
    <View style={wrapperStyles}>
      <Ionicons name="image" size={20} />
      <Text>{step.title}</Text>
      <Text>{getDuration(step)}h</Text>
    </View>
  )
}

interface Props {
    step: TripStep
}

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
  backgroundColor: '#C6C8EE',
  borderColor: 'lightgray',
  borderRadius: 8,
  borderWidth: 1,
  columnGap: 10,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  padding: 12,
  width: '100%',
}

export default VisitStep
