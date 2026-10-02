import StepForm from '../StepForm/StepForm'
import { ROUTES } from '../../../common/db/routes'
import { addStep } from '../../../common/db/utils'
import { StepType, TripStep } from '../types'
import { useTripsContext } from '../../../../state/TripsContext'
import { router } from 'expo-router'

const AddStep = ({ start, end, type }: Props) => {
  const context = useTripsContext()

  const addNewStep = async (stepData: TripStep<any>) => {
    await addStep(stepData, context)
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace(ROUTES.TRIP_DETAILS)
    }
  }

  return <StepForm start={start} end={end} type={type} mode="add" onSubmit={addNewStep}></StepForm>
}

interface Props {
  start: Date
  end: Date
  // Tipo con cui si apre il form (se manca, "visita")
  type?: StepType
}

export default AddStep
