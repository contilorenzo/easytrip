import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import FlagBlurBackground from './FlagBlurBackground'

interface Props {
  countryCode?: string
  // Colori del tema del paese: quello centrale si vede mentre la bandiera si carica
  colors: string[]
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

// Sfondo di card e schermate dei viaggi: la bandiera del paese, ingrandita e sfocata
const ThemeBackground = ({ countryCode, colors, style, children }: Props) => (
  <FlagBlurBackground countryCode={countryCode} fallbackColor={colors[Math.floor(colors.length / 2)]} style={style}>
    {children}
  </FlagBlurBackground>
)

export default ThemeBackground
