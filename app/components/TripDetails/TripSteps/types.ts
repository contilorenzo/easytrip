export enum StepType {
  ACCOMODATION = 'accomodation',
  JOURNEY = 'journey',
  VISIT = 'visit',
  FOOD = 'food',
}

export interface Link {
  url: string
  label: string
  newTab?: boolean
}

export interface TripStep<T> {
  type: StepType
  startDateTime: string
  endDateTime: string
  title: string
  links?: Link[]
  extraData?: T
}

export interface AccomodationData {
  location: string
}

export interface VisitData {
  location: string
}

export interface JourneyData {
  vehicle: VEHICLES
}

export enum VEHICLES {
  CAR = 'car',
  PLANE = 'plane',
  BUS = 'bus',
  TRAIN = 'train',
  FEET = 'feet',
  BOAT = 'boat',
}
