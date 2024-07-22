import { Ionicons } from '@expo/vector-icons'

export type IonIcon = keyof typeof Ionicons.glyphMap

export interface Option {
  value: string
  label: string
}
