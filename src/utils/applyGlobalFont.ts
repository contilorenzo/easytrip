import * as React from 'react'

// Serve l'oggetto vero esportato da react-native, non la copia che crea `import * as`: i getter vanno sostituiti lì
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactNative = require('react-native')
const { StyleSheet } = ReactNative

// Font Inter su Android. Su iOS resta il font di sistema (San Francisco), che è quello che piace; San Francisco non si può
// usare su Android (la licenza lo limita alle piattaforme Apple) e Inter è il suo equivalente libero più vicino.
// Su Android un font personalizzato ha bisogno di un file per ogni peso (non genera i pesi intermedi come il font
// di sistema): qui il peso richiesto (`fontWeight`) viene tradotto nella famiglia giusta e poi azzerato, altrimenti
// Android applicherebbe un secondo grassetto "finto" sopra a quello vero.
const FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_900Black',
}

// Il corsivo esiste solo per due pesi: sotto il 600 uso quello normale, da 600 in su quello grassetto
const ITALIC_REGULAR = 'Inter_400Regular_Italic'
const ITALIC_BOLD = 'Inter_700Bold_Italic'

const withInter = (style: any) => {
  const flat: any = StyleSheet.flatten(style) ?? {}
  // Se il testo ha già una sua famiglia (per esempio un'icona) non la tocco
  if (flat.fontFamily) return style

  const weight = String(flat.fontWeight ?? 'normal')
  let family = FAMILY_BY_WEIGHT[weight] ?? 'Inter_400Regular'
  if (flat.fontStyle === 'italic') {
    const heavy = ['600', '700', 'bold', '800', '900'].includes(weight)
    family = heavy ? ITALIC_BOLD : ITALIC_REGULAR
  }
  return [style, { fontFamily: family, fontWeight: 'normal', fontStyle: 'normal' }]
}

const patchComponent = (name: 'Text' | 'TextInput') => {
  const Original: any = ReactNative[name]
  const Patched = (props: any) => React.createElement(Original, { ...props, style: withInter(props.style) })
  Patched.displayName = name

  // `react-native` espone i componenti con dei getter: li sostituisco così ogni import di Text e TextInput
  // (anche nelle librerie) usa Inter
  Object.defineProperty(ReactNative, name, { get: () => Patched, configurable: true })
}

let applied = false
export const applyGlobalFont = () => {
  if (applied || ReactNative.Platform.OS !== 'android') return
  applied = true
  patchComponent('Text')
  patchComponent('TextInput')
}
