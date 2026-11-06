import React, { ReactNode } from 'react'
import { Platform } from 'react-native'
import { Stack } from 'expo-router'

// Su iOS indietro e le azioni stanno nella barra nativa (con iOS 26 sono in liquid glass); su Android restano
// i pulsanti disegnati dalle singole schermate
export const hasNativeHeader = Platform.OS === 'ios'

interface Props {
  // Colore di indietro e del titolo: chiaro sopra gradienti e sfondi scuri, scuro sopra sfondi chiari
  tintColor?: string
  title?: string
  gestureEnabled?: boolean
  // Pulsanti a destra: Stack.Toolbar.Button (solo iOS)
  children?: ReactNode
}

// Barra nativa trasparente: il contenuto della schermata (gradiente, hero) resta visibile sotto
const NativeNavHeader = ({ tintColor = '#FFFFFF', title = '', gestureEnabled = true, children }: Props) => {
  if (!hasNativeHeader) {
    return <Stack.Screen options={{ headerShown: false, gestureEnabled }} />
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: title,
          headerTintColor: tintColor,
          headerBackButtonDisplayMode: 'minimal',
          gestureEnabled,
        }}
      />
      {children ? <Stack.Toolbar placement="right">{children}</Stack.Toolbar> : null}
    </>
  )
}

export default NativeNavHeader
