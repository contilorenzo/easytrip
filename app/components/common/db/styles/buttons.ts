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
  },
  text: {
    color: 'white',
    display: 'flex',
    fontWeight: '600',
  },
  icon: {
    color: 'white',
    display: 'flex',
  },
}
