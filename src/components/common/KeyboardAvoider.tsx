import React from 'react'
import { KeyboardAvoidingView, Platform, StyleProp, View, ViewStyle } from 'react-native'

interface Props {
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

// Fa spostare i campi di testo sopra la tastiera, con i meccanismi nativi di ogni piattaforma:
// - Android: KeyboardAvoidingView riduce lo spazio della schermata quando la tastiera è aperta
// - iOS: ci pensa lo ScrollView con `automaticallyAdjustKeyboardInsets` (vedi keyboardScrollProps), che sposta anche
//   il campo in uso fino a farlo vedere; per questo qui basta una vista semplice
export const KeyboardAvoider = ({ style, children }: Props) =>
  Platform.OS === 'android' ? (
    <KeyboardAvoidingView behavior="padding" style={style}>
      {children}
    </KeyboardAvoidingView>
  ) : (
    <View style={style}>{children}</View>
  )

// Da dare agli ScrollView che contengono campi di testo
export const keyboardScrollProps = {
  automaticallyAdjustKeyboardInsets: true,
  keyboardShouldPersistTaps: 'handled' as const,
  keyboardDismissMode: Platform.OS === 'ios' ? ('interactive' as const) : ('on-drag' as const),
}
