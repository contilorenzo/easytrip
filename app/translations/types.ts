export enum TranslationsKeys {
  appName,
  addNewTrip,
  addFirstTrip,
  yourTrips,
  trip_city,
  trip_country,
  trip_startDate,
  trip_endDate,
  trip_addTrip,
  trip_newTripPageTitle,
  trip_addStep,
  trip_tripDetails,
  trip_removeConfirmTitle,
  trip_removeConfirmDescription,
  trip_step_title,
  trip_step_type,
  trip_step_vehicle,
  trip_step_startDateTime,
  trip_step_endDateTime,
  trip_step_removeConfirmTitle,
  trip_step_removeConfirmDescription,
  trip_searchCountry,
  day,
  days,
  remainingDays,
  from,
  to,
  confirm,
  cancel,
  noResults
}

export type Translations = {
  [key in TranslationsKeys]: string
}

export enum Languages {
  IT = 'IT',
  EN = 'EN',
  ES = 'ES',
}
