import { TripStep } from '../../types'

export const getDurationInHours = (step: TripStep) => {
  const startDateTime = new Date(step.startDateTime)
  const endDateTime = new Date(step.endDateTime)

  var duration = (endDateTime.valueOf() - startDateTime.valueOf()) / 1000 / 60

  var hours = minutesToHours(duration)

  return hours
}

const minutesToHours = (minutes: number) => {
  var mins = minutes % 60
  var hours = (minutes - mins) / 60

  return (
    hours.toString() +
    ':' +
    (mins < 10 ? '0' : '') +
    mins.toString()
  )
}
