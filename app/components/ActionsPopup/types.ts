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

export interface ActionsMenuConfig {
  title?: string
  titleStyle?: TextStyle
  subtitle?: string
  subtitleStyle?: TextStyle
  actions: Action[]
}
