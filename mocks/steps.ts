import {
  StepType,
  TripStep,
  VEHICLES,
} from '../app/components/TripDetails/TripSteps/types'

export const mockSteps: TripStep<any>[] = [
  {
    type: StepType.JOURNEY,
    title: 'Aereo BGY - ZAD',
    startDateTime: '2024-06-14T06:00:00.000Z',
    endDateTime: '2024-06-14T07:10:00.000Z',
    extraData: {
      vehicle: VEHICLES.PLANE,
    },
  },
  {
    type: StepType.VISIT,
    title: 'Petrcane Beach',
    startDateTime: '2024-06-14T09:00:00.000Z',
    endDateTime: '2024-06-14T12:00:00.000Z',
  },
  {
    type: StepType.JOURNEY,
    title: 'Viaggio in auto',
    startDateTime: '2024-06-14T12:00:00.000Z',
    endDateTime: '2024-06-14T14:00:00.000Z',
    extraData: {
      vehicle: VEHICLES.CAR,
    },
  },
  {
    type: StepType.JOURNEY,
    title: 'Viaggio in treno',
    startDateTime: '2024-06-14T12:00:00.000Z',
    endDateTime: '2024-06-14T14:00:00.000Z',
    extraData: {
      vehicle: VEHICLES.TRAIN,
    },
  },
  {
    type: StepType.JOURNEY,
    title: 'Viaggio in autobus',
    startDateTime: '2024-06-14T12:00:00.000Z',
    endDateTime: '2024-06-14T14:00:00.000Z',
    extraData: {
      vehicle: VEHICLES.BUS,
    },
  },
  {
    type: StepType.JOURNEY,
    title: 'Viaggio a piedi',
    startDateTime: '2024-06-14T12:00:00.000Z',
    endDateTime: '2024-06-14T14:00:00.000Z',
    extraData: {
      vehicle: VEHICLES.FEET,
    },
  },
  {
    type: StepType.VISIT,
    title: 'Laghi Plitvice',
    startDateTime: '2024-06-14T14:00:00.000Z',
    endDateTime: '2024-06-14T22:00:00.000Z',
  },
  {
    type: StepType.JOURNEY,
    title: 'Rientro a Zara',
    startDateTime: '2024-06-14T22:00:00.000Z',
    endDateTime: '2024-06-14T23:00:00.000Z',
    extraData: {
      vehicle: VEHICLES.PLANE,
    },
  },
  {
    type: StepType.ACCOMODATION,
    title: 'Apartments Jermen',
    startDateTime: '2024-06-14T23:00:00.000Z',
    endDateTime: '2024-06-15T09:00:00.000Z',
  },
  {
    type: StepType.JOURNEY,
    title: 'Aereo ZAD - MXP',
    startDateTime: '2024-06-14T06:00:00.000Z',
    endDateTime: '2024-06-14T07:10:00.000Z',
    extraData: {
      vehicle: VEHICLES.PLANE,
    },
  },
]
