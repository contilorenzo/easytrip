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
  trip_addStep,
  trip_step_title,
  trip_step_type,
  trip_step_vehicle,
  trip_step_startDateTime,
  trip_step_endDateTime,
  day,
  days,
  remainingDays,
  from,
  to,
  confirm,
}

export type Translations = {
  [key in TranslationsKeys]: string
}

export enum Languages {
  IT = 'IT',
  EN = 'EN',
  ES = 'ES',
}
