export enum TranslationsKeys {
  addNewTrip,
  addFirstTrip,
  yourTrips,
}

export type Translations = {
  [key in TranslationsKeys]: string
}

export enum Languages {
  IT = 'IT',
  EN = 'EN',
  ES = 'ES',
}