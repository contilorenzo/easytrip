import { Alert } from 'react-native'

interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  // true = pulsante rosso (azioni che eliminano dati)
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}

// Unico punto in cui l'app chiede una conferma: finestra nativa con "Annulla" e il pulsante di conferma
export const confirmAction = ({
  title,
  message,
  confirmText = 'Elimina',
  cancelText = 'Annulla',
  destructive = true,
  onConfirm,
}: ConfirmOptions) => {
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ])
}
