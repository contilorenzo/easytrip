import {
  Text,
  TextStyle,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native'
import { Action } from './types'
import { Ionicons } from '@expo/vector-icons'

const ActionsPopup = ({ actions, setShow }: Props) => {
  return (
    <TouchableOpacity style={wrapperStyles} onPressIn={() => setShow(false)}>
      <View style={actionsListStyles}>
        {actions.map((action) => (
          <TouchableOpacity
            style={{ ...actionStyles, ...action.actionStyle }}
            key={action.label}
            onPress={() => {
              setShow(false)
              action.onClick()
            }}
          >
            <Text style={{ ...labelStyles, ...action?.labelStyle }}>
              {action.label}
            </Text>
            <Ionicons
              name={action.icon}
              style={{ ...iconStyles, ...action?.iconStyle }}
            />
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  )
}

interface Props {
  actions: Action[]
  setShow: (show: boolean) => void
}

export default ActionsPopup

const wrapperStyles: ViewStyle = {
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  height: '100%',
  justifyContent: 'center',
  left: 0,
  overflow: 'hidden',
  position: 'absolute',
  top: 0,
  width: '100%',
  zIndex: 99999,
}

const actionsListStyles: ViewStyle = {
  backgroundColor: 'whitesmoke',
  borderRadius: 10,
  width: '68%',
}

const actionStyles: ViewStyle = {
  alignItems: 'center',
  borderColor: 'rgba(0, 0, 0, 0.1)',
  borderBottomWidth: 1,
  display: 'flex',
  flexDirection: 'row',
  gap: 8,
  justifyContent: 'space-between',
  paddingHorizontal: 20,
  paddingVertical: 12,
}

const labelStyles: TextStyle = {
  fontSize: 18,
  fontWeight: '400',
}

const iconStyles: TextStyle = {
  fontSize: 18,
  fontWeight: '400',
}
