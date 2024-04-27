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
  startDate: Date
  endDate: Date
}