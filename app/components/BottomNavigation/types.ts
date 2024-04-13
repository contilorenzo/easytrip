import { ParamListBase, RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'

export interface NavigationItem {
  label: string
  path: string
  component: () => React.ReactNode
  icon: {
    default: keyof typeof Ionicons.glyphMap
    active: keyof typeof Ionicons.glyphMap
  }
}

export interface TabBarIcon {
  focused: Boolean
  color: string
  size: number
  route: RouteProp<ParamListBase, string>
}
