export interface Trip {
  id: number
  city: string
  country: string
  startDate: Date
  endDate: Date
  steps?: TripStep[]
}

export enum StepType {
  ACCOMODATION = 'ACCOMODATION',
  JOURNEY = 'JOURNEY',
  VISIT = 'VISIT'
}

export interface TripStep {
  type: StepType
  startDateTime: string
  endDateTime: string
  title: string
  location?: string
}

export interface NewTrip {
  city: string
  country: string
  startDate: string
  endDate: string
}

export interface TripDTO {
  id: number
  city: string
  country: string
  startDate: string
  endDate: string
}
