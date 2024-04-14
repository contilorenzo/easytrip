import { Languages, TranslationsKeys } from './types'
import IT from './languages/IT'

const languages = {
  IT: IT,
}

export const t = (
  label: TranslationsKeys,
  language: Languages = Languages.IT
) => {
  return languages?.[language]?.[label] ?? '~~ MISSING TRANSLATION ~~'
}
