import { TextStyle, ViewStyle } from 'react-native'

export interface CtaStyles {
  button: ViewStyle
  text: TextStyle
  icon: TextStyle
}

export const primaryCtaStyles: CtaStyles = {
  button: {
    borderRadius: 10,
    backgroundColor: 'tomato',
    padding: 14,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  text: {
    color: 'white',
    display: 'flex',
    fontSize: 16,
    fontWeight: '800',
  },
  icon: {
    color: 'white',
    display: 'flex',
  },
}
