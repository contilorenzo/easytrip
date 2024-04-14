export enum TranslationsKeys {
  addNewTrip,
  addFirstTrip,
}

export type Translations = {
  [key in TranslationsKeys]: string
}

export enum Languages {
  IT = 'IT',
  EN = 'EN',
  ES = 'ES',
}