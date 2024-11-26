import { TextStyle, ViewStyle } from 'react-native'
import { IonIcon } from '../common/types'

export interface Action {
  label: string
  onClick: () => void
  icon: IonIcon
  labelStyle?: TextStyle
  actionStyle?: ViewStyle
  iconStyle?: TextStyle
}
