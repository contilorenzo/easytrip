import StepForm from '../StepForm/StepForm'
import { ROUTES } from '../../../common/db/routes'
import { addStep } from '../../../common/db/utils'
import { TripStep } from '../types'
import { useTripsContext } from '../../../../state/TripsContext'

const AddStep = ({ navigation, start, end }: Props) => {
  const context = useTripsContext()

  const addNewStep = async (stepData: TripStep<any>) => {
    await addStep(stepData, context)
    navigation.navigate(ROUTES.TRIP_DETAILS)
  }

  return <StepForm start={start} end={end} onSubmit={addNewStep}></StepForm>
}

interface Props {
  navigation: any
  start: Date
  end: Date
}

export default AddStep
