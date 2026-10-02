import { stepFont } from '../../../../../utils/stepsFont'
import { STEP_TOOLTIP_GAP, STEP_TOOLTIP_SPACE } from '../../stepTooltip'
import { canEdit } from '../../../../../utils/tripRole'
import { useEffect, useRef } from 'react'
import {
  Animated,
  Text,
  TextStyle,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native'
import { StepType, TripStep, VEHICLES } from '../../types'
import { Ionicons } from '@expo/vector-icons'
import { IonIcon } from '../../../../common/types'
import { format, isAfter, isBefore, isEqual } from 'date-fns'
import { LinearGradient } from 'expo-linear-gradient'
import { removeStep } from '../../../../common/db/utils'
import { useTripsContext } from '../../../../../state/TripsContext'
import { t } from '../../../../../translations'
import { TranslationsKeys } from '../../../../../translations/types'
import { confirmAction } from '../../../../../utils/confirm'
import { ROUTES } from '../../../../common/db/routes'
import { router } from 'expo-router'

const DAY_COLORS = [
  '#FF6B6B', // Giorno 1: Corallo
  '#14B8A6', // Giorno 2: Turchese / Menta
  '#2563EB', // Giorno 3: Blu Reale (stacco netto e chiarissimo!)
  '#9333EA', // Giorno 4: Viola
  '#F59E0B', // Giorno 5: Arancio ambra
  '#EC4899', // Giorno 6: Rosa acceso
  '#0891B2', // Giorno 7: Ciano profondo
  '#4F46E5', // Giorno 8: Indaco
]

const DefaultStep = ({
  step,
  overrideStyle,
  icon,
  day,
  onStepPress,
  selectedStep
}: Props): React.ReactNode => {
  const currentDay = new Date(day).setHours(0, 0, 0, 0)
  const firstDay = new Date(step.startDateTime).setHours(0, 0, 0, 0)
  const lastDay = new Date(step.endDateTime).setHours(0, 0, 0, 0)

  const followsPreviousDay = () => {
    if (isAfter(currentDay, firstDay) && !isEqual(lastDay, firstDay)) {
      return true
    }
    return false
  }

  const continuesNextDay = () => {
    if (isBefore(currentDay, lastDay) && !isEqual(lastDay, firstDay)) {
      return true
    }
    return false
  }

  const tripsContext = useTripsContext()
  const tripStartDate = new Date(tripsContext.currentTrip?.startDate || new Date()).setHours(0,0,0,0)
  
  const getDayColor = () => {
    const currentDayDate = new Date(day).setHours(0, 0, 0, 0)
    const diff = Math.round((currentDayDate - tripStartDate) / 86400000)
    return DAY_COLORS[Math.max(0, diff) % DAY_COLORS.length]
  }

  const dayColor = getDayColor()

  const isSelected = selectedStep &&
    step.title === selectedStep.title &&
    step.startDateTime === selectedStep.startDateTime &&
    (!selectedStep.targetDay || selectedStep.targetDay === day)

  const handleRemoveClick = () => {
    confirmAction({
      title: 'Elimina tappa',
      message: `${t(TranslationsKeys.trip_step_removeConfirmDescription)} '${step.title}'`,
      onConfirm: () => removeStep(step, tripsContext),
    })
  }

  const handleUpdateClick = () => {
    router.push({
      pathname: ROUTES.UPDATE_STEP,
      params: { stepData: JSON.stringify(step) },
    })
  }

  const getBoxStyle = (): ViewStyle => ({
    backgroundColor: '#ffffff',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    width: '100%',
    // Selezionata: contorno sottile color corallo
    borderWidth: isSelected ? 1.5 : 1,
    borderColor: isSelected ? 'tomato' : '#EEF2F6',
    ...(overrideStyle ?? {}),
  })

  const getIconContainerStyle = (): ViewStyle => ({
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
  })

  const adjustHexColor = (color: string, amount: number) => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
  }


  return (
    <View style={wrapperStyles}>
      <View style={getBoxStyle()}>
        <View style={{ flexDirection: 'row', width: '100%', alignItems: 'stretch' }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', flex: 1, alignItems: 'stretch' }}
            onPress={() => {
              if (onStepPress) onStepPress(step, day)
            }}
            activeOpacity={0.7}
          >
            <LinearGradient 
              colors={[adjustHexColor(dayColor, 30), adjustHexColor(dayColor, -20)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={getIconContainerStyle()}
            >
              <Ionicons name={icon ?? getStepTypeIcon(step.type)} size={15} color="white" />
            </LinearGradient>
            <View style={contentStyles}>
              <Text style={contentTextStyles} numberOfLines={2}>{step.title}</Text>
            </View>
          </TouchableOpacity>

          {/* Dedicated Time Section on the Right */}
          <View style={timeSectionStyle}>
            <Text style={timestampStyle}>
              {followsPreviousDay() ? (
                <Ionicons name="moon" size={10} color="#94A3B8" />
              ) : (
                format(new Date(step.startDateTime), 'HH:mm')
              )}
            </Text>
            <View style={timeDividerStyle} />
            <Text style={timestampStyle}>
              {continuesNextDay() ? (
                <Ionicons name="moon" size={10} color="#94A3B8" />
              ) : (
                format(new Date(step.endDateTime), 'HH:mm')
              )}
            </Text>
          </View>
        </View>

      </View>

      {/* Azioni sulla tappa selezionata: tooltip a sinistra della card, in sovrapposizione */}
      {isSelected && canEdit(tripsContext.currentTrip) && (
        <StepActionsTooltip onEdit={handleUpdateClick} onDelete={handleRemoveClick} />
      )}
    </View>
  )
}

const StepActionsTooltip = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => {
  const appear = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 160, useNativeDriver: true }).start()
  }, [])

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        tooltipRowStyle,
        { opacity: appear, transform: [{ translateX: appear.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] },
      ]}
    >
      <View style={tooltipStyle}>
        <View style={tooltipArrowStyle} />
        <TouchableOpacity style={tooltipButtonStyle} onPress={onEdit} activeOpacity={0.7} hitSlop={{ left: 4, right: 4 }}>
          <Ionicons name="create-outline" size={stepFont(17)} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={tooltipDividerStyle} />
        <TouchableOpacity style={tooltipButtonStyle} onPress={onDelete} activeOpacity={0.7} hitSlop={{ left: 4, right: 4 }}>
          <Ionicons name="trash-outline" size={stepFont(17)} color="#FCA5A5" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

export const getStepTypeIcon = (stepType: StepType) => {
  const icons = {
    [StepType.ACCOMODATION]: 'bed-outline',
    [StepType.FOOD]: 'pizza-outline',
    [StepType.VISIT]: 'location-outline',
  }

  return (icons[stepType] ?? 'calendar') as IonIcon
}

export const getVehicleIcon = (vehicle: VEHICLES) => {
  const icons = {
    [VEHICLES.PLANE]: 'airplane',
    [VEHICLES.CAR]: 'car',
    [VEHICLES.BUS]: 'bus',
    [VEHICLES.FEET]: 'walk',
    [VEHICLES.TRAIN]: 'train',
    [VEHICLES.BOAT]: 'boat',
  }

  return (icons[vehicle] ?? 'car') as IonIcon
}

interface Props {
  step: TripStep<any>
  overrideStyle?: ViewStyle
  icon?: IonIcon
  day: string
  onStepPress?: (step: TripStep<any>, day?: string) => void
  selectedStep?: any
}


// Niente larghezza fissa: la tappa si estende a tutta la riga, compreso lo spazio a sinistra guadagnato col margine negativo
const wrapperStyles: ViewStyle = {
  alignSelf: 'stretch',
  marginLeft: -STEP_TOOLTIP_SPACE,
  paddingLeft: STEP_TOOLTIP_SPACE,
}

const contentStyles: ViewStyle = {
  flex: 1,
  justifyContent: 'center',
  paddingVertical: 5,
  paddingHorizontal: 8,
}

const contentTextStyles: TextStyle = {
  fontWeight: '600',
  fontSize: stepFont(12),
  color: '#1E293B',
  lineHeight: stepFont(16),
}

const timeSectionStyle: ViewStyle = {
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderLeftWidth: 1,
  borderLeftColor: '#F1F5F9',
  backgroundColor: '#F8FAFC',
  minWidth: stepFont(42),
  borderTopRightRadius: 9,
  borderBottomRightRadius: 9,
}

const timestampStyle: TextStyle = {
  color: '#475569',
  fontSize: stepFont(10),
  fontWeight: '700',
  letterSpacing: -0.2,
}

const timeDividerStyle: ViewStyle = {
  height: 1,
  width: 10,
  backgroundColor: '#CBD5E1',
  marginVertical: 1.5,
}

// Il wrapper si allarga a sinistra (margine negativo) e recupera lo spazio con un margine interno uguale: il layout
// visibile non cambia, ma l'area del tooltip sta dentro i bordi del contenitore e su Android riceve i tocchi
const tooltipRowStyle: ViewStyle = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: STEP_TOOLTIP_SPACE - STEP_TOOLTIP_GAP,
  justifyContent: 'center',
  alignItems: 'flex-start',
}

const tooltipStyle: ViewStyle = {
  alignItems: 'center',
  backgroundColor: '#1E293B',
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 6,
}

// Rombo ruotato che fa da punta del tooltip e indica la card
const tooltipArrowStyle: ViewStyle = {
  position: 'absolute',
  right: -4,
  top: '50%',
  marginTop: -5,
  width: 10,
  height: 10,
  backgroundColor: '#1E293B',
  transform: [{ rotate: '45deg' }],
}

const tooltipButtonStyle: ViewStyle = {
  width: STEP_TOOLTIP_SPACE - STEP_TOOLTIP_GAP,
  height: 34,
  alignItems: 'center',
  justifyContent: 'center',
}

const tooltipDividerStyle: ViewStyle = {
  height: 1,
  width: 20,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
}

export default DefaultStep
