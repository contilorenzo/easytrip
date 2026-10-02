import StepForm from '../StepForm/StepForm'
import { ROUTES } from '../../../common/db/routes'
import { TripStep } from '../types'
import { useTripsContext } from '../../../../state/TripsContext'
import { Props as StepFormProps } from '../StepForm/StepForm'
import { updateStep, removeStep } from '../../../common/db/utils'
import { confirmAction } from '../../../../utils/confirm'
import { router } from 'expo-router'

const UpdateStep = ({ stepData }: Props) => {
  const context = useTripsContext()
  const originalStep = { ...stepData }

  const onSubmit = async (newStepData: TripStep<any>) => {
    await updateStep(originalStep, newStepData, context)

    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace(ROUTES.TRIP_DETAILS)
    }
  }

  const goBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace(ROUTES.TRIP_DETAILS)
    }
  }

  const onDelete = () => {
    confirmAction({
      title: 'Elimina tappa',
      message: `Vuoi eliminare "${stepData.title}"?`,
      onConfirm: async () => {
        await removeStep(originalStep, context)
        goBack()
      },
    })
  }

  const formProps: StepFormProps = {
    title: stepData.title,
    type: stepData.type,
    vehicle: stepData?.extraData?.vehicle,
    location: stepData?.extraData?.location,
    departure: stepData?.extraData?.departure,
    arrival: stepData?.extraData?.arrival,
    start: new Date(stepData.startDateTime),
    end: new Date(stepData.endDateTime),
    mode: 'update',
    onDelete,
    onSubmit,
  }

  return <StepForm {...formProps}></StepForm>
}

interface Props {
  stepData: TripStep<any>
}

export default UpdateStep
