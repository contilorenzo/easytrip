export enum StepType {
  ACCOMODATION = 'accomodation',
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
  extraData?: T & { arrivedBy?: VEHICLES, location?: Location }
}

export interface VisitData {}

export interface AccomodationData {}

export interface FoodData {}

export interface JourneyData {}

export enum VEHICLES {
  CAR = 'car',
  PLANE = 'plane',
  BUS = 'bus',
  TRAIN = 'train',
  FEET = 'feet',
  BOAT = 'boat',
}

export interface Location {
  name: string
  address: string
  coordinates: {
    lat: number
    lng: number
  }
}
