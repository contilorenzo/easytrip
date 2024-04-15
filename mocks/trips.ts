import { Trip } from '../app/components/TripsList/types'

export const mockTrips: Trip[] = [
  {
    id: 1,
    city: 'Paris',
    country: 'France',
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-05-05'),
  },
  {
    id: 2,
    city: 'Tokyo',
    country: 'Japan',
    startDate: new Date('2024-06-10'),
    endDate: new Date('2024-06-15'),
  },
  {
    id: 3,
    city: 'New York City',
    country: 'USA',
    startDate: new Date('2024-07-20'),
    endDate: new Date('2024-07-25'),
  },
]
