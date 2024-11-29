import { Text, TextStyle, ViewStyle, TouchableOpacity } from 'react-native'
import { ActionsMenuConfig } from './types'
import { Ionicons } from '@expo/vector-icons'
import { MotiView, View } from 'moti'

const ActionsPopup = ({ actionsMenuConfig, closePopup }: Props) => {
  const {
    actions,
    title,
    subtitle,
    titleStyle: overrideTitleStyles,
    subtitleStyle: overrideSubtitleStyles,
  } = actionsMenuConfig

  return (
    <TouchableOpacity style={wrapperStyles} onPressIn={closePopup}>
      <MotiView
        from={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'timing' }}
        style={actionsListStyles}
      >
        {(subtitle || title) && (
          <View style={headerStyles}>
            {title && (
              <Text style={{ ...titleStyles, ...overrideTitleStyles }}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={{ ...subtitleStyles, ...overrideSubtitleStyles }}>
                {subtitle}
              </Text>
            )}
          </View>
        )}

        {actions.map((action) => (
          <TouchableOpacity
            style={{ ...actionStyles, ...action.actionStyle }}
            key={action.label}
            onPress={() => {
              closePopup()
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
      </MotiView>
    </TouchableOpacity>
  )
}

interface Props {
  actionsMenuConfig: ActionsMenuConfig
  closePopup: () => void
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

const headerStyles: ViewStyle = {
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 20,
  paddingVertical: 24,
  width: '100%',
}

const actionsListStyles: ViewStyle = {
  backgroundColor: 'whitesmoke',
  borderRadius: 10,
  width: '68%',
}

const actionStyles: ViewStyle = {
  alignItems: 'center',
  borderColor: 'rgba(0, 0, 0, 0.1)',
  borderTopWidth: 1,
  display: 'flex',
  flexDirection: 'row',
  gap: 8,
  justifyContent: 'center',
  paddingHorizontal: 20,
  paddingVertical: 12,
}

const labelStyles: TextStyle = {
  fontSize: 17,
  fontWeight: '400',
}

const iconStyles: TextStyle = {
  fontSize: 17,
  fontWeight: '400',
}

const titleStyles: TextStyle = {
  fontSize: 20,
  fontWeight: 'bold',
  textAlign: 'center',
}

const subtitleStyles: TextStyle = {
  fontSize: 13,
  textAlign: 'center',
}
