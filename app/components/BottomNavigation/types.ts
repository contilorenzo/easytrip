import { ParamListBase, RouteProp } from '@react-navigation/native'
import { IonIcon } from '../common/types'

export interface NavigationItem {
  label: string
  path: string
  component: () => React.ReactNode
  icon: {
    default: IonIcon
    active: IonIcon
  }
}

export interface TabBarIcon {
  focused: Boolean
  color: string
  size: number
  route: RouteProp<ParamListBase, string>
}
