import StepForm from '../StepForm/StepForm'
import { ROUTES } from '../../../common/db/routes'
import { TripStep } from '../types'
import { useTripsContext } from '../../../../state/TripsContext'
import { Props as StepFormProps } from '../StepForm/StepForm'
import { updateStep } from '../../../common/db/utils'

const UpdateStep = ({ navigation, stepData }: Props) => {
  const context = useTripsContext()
  const originalStep = { ...stepData }

  const onSubmit = async (newStepData: TripStep<any>) => {
    await updateStep(originalStep, newStepData, context)

    navigation.navigate(ROUTES.TRIP_DETAILS)
  }

  const formProps: StepFormProps = {
    title: stepData.title,
    type: stepData.type,
    vehicle: stepData?.extraData?.vehicle,
    location: stepData?.extraData?.location,
    start: new Date(stepData.startDateTime),
    end: new Date(stepData.endDateTime),
    onSubmit,
  }

  return <StepForm {...formProps}></StepForm>
}

interface Props {
  navigation: any
  stepData: TripStep<any>
}

export default UpdateStep
