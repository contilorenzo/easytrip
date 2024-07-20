import { TripStep } from "../TripDetails/TripSteps/types"

export interface Trip {
  id: number
  city: string
  country: string
  startDate: Date
  endDate: Date
  steps?: TripStep[]
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
