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
  trip_tripTo,
  day,
  days,
  remainingDays,
  from,
  to,
  confirm,
  cancel,
  noResults,
  vehicle_car,
  vehicle_train,
  vehicle_bus,
  vehicle_plane,
  vehicle_feet,
  vehicle_boat,
  step_type_journey,
  step_type_accomodation,
  step_type_visit,
  step_type_food

}

export type Translations = {
  [key in TranslationsKeys]: string
}

export enum Languages {
  IT = 'IT',
  EN = 'EN',
  ES = 'ES',
}
