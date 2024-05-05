export interface Trip {
  id: number
  city: string
  country: string
  startDate: Date
  endDate: Date
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
