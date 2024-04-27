export enum TranslationsKeys {
  addNewTrip,
  addFirstTrip,
  yourTrips,
  trip_city,
  trip_country,
  trip_startDate,
  trip_endDate,
  trip_addTrip,
  trip_newTripPageTitle,
}

export type Translations = {
  [key in TranslationsKeys]: string
}

export enum Languages {
  IT = 'IT',
  EN = 'EN',
  ES = 'ES',
}