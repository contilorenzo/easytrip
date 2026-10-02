import { Platform } from 'react-native'

// I testi della lista tappe sono stati pensati piccoli per Android; su iOS risultavano troppo piccoli, quindi li ingrandisco.
// Le misure originali restano quelle di Android.
const IOS_FONT_SCALE = 1.2

export const stepFont = (size: number) =>
  Platform.OS === 'ios' ? Math.round(size * IOS_FONT_SCALE * 2) / 2 : size
