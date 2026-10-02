import React, { useMemo, useState } from 'react'
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { Ionicons } from '@expo/vector-icons'
import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { it } from 'date-fns/locale'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

LocaleConfig.locales.it = {
  monthNames: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  monthNamesShort: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
  dayNames: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
  today: 'Oggi',
}
LocaleConfig.defaultLocale = 'it'

const ACCENT = '#FF5A5F'
const ACCENT_LIGHT = '#FFE4E6'

const toKey = (date: Date) => format(date, 'yyyy-MM-dd')
// Data a mezzanotte locale a partire da "yyyy-MM-dd"
const fromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

interface Props {
  start: Date
  end: Date
  onChange: (start: Date, end: Date) => void
  // Calendario sempre visibile, senza apertura e chiusura (per esempio dentro una finestra dedicata alle date)
  alwaysOpen?: boolean
}

// Un solo selettore per l'intero periodo: si tocca il primo giorno e poi l'ultimo
const DateRangeField = ({ start, end, onChange, alwaysOpen = false }: Props) => {
  const [openState, setOpen] = useState(false)
  const open = alwaysOpen || openState
  // Dopo il primo tocco si attende il secondo per chiudere l'intervallo
  const [pendingStart, setPendingStart] = useState<string | null>(null)

  const days = Math.max(1, differenceInCalendarDays(end, start) + 1)

  const toggle = () => {
    if (alwaysOpen) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setPendingStart(null)
    setOpen((v) => !v)
  }

  const handleDayPress = (dateString: string) => {
    if (!pendingStart) {
      // Primo tocco: nuovo inizio, la fine coincide finché non si sceglie il secondo giorno
      setPendingStart(dateString)
      onChange(fromKey(dateString), fromKey(dateString))
      return
    }
    if (dateString < pendingStart) {
      // Secondo tocco prima dell'inizio: lo considero il nuovo inizio
      setPendingStart(dateString)
      onChange(fromKey(dateString), fromKey(dateString))
      return
    }
    onChange(fromKey(pendingStart), fromKey(dateString))
    setPendingStart(null)
    if (alwaysOpen) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpen(false)
  }

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {}
    const startKey = toKey(start)
    const endKey = toKey(end)
    const total = differenceInCalendarDays(end, start)
    for (let i = 0; i <= total; i++) {
      const key = toKey(addDays(start, i))
      const isStart = key === startKey
      const isEnd = key === endKey
      marks[key] = {
        startingDay: isStart,
        endingDay: isEnd,
        color: isStart || isEnd ? ACCENT : ACCENT_LIGHT,
        textColor: isStart || isEnd ? '#FFFFFF' : '#BE123C',
      }
    }
    return marks
  }, [start, end])

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.summary} onPress={toggle} activeOpacity={alwaysOpen ? 1 : 0.8}>
        <View style={styles.summaryIcon}>
          <Ionicons name="calendar" size={17} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Periodo</Text>
          <Text style={styles.range} numberOfLines={1}>
            {format(start, 'd MMM', { locale: it })} → {format(end, 'd MMM yyyy', { locale: it })}
          </Text>
        </View>
        <View style={styles.daysBadge}>
          <Text style={styles.daysText}>
            {days} {days === 1 ? 'giorno' : 'giorni'}
          </Text>
        </View>
        {!alwaysOpen && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />}
      </TouchableOpacity>

      {open && (
        <View style={styles.calendarWrapper}>
          <Text style={styles.hint}>
            {pendingStart ? 'Ora scegli l’ultimo giorno del viaggio' : 'Scegli il primo e l’ultimo giorno del viaggio'}
          </Text>
          <Calendar
            current={toKey(start)}
            firstDay={1}
            markingType="period"
            markedDates={markedDates}
            onDayPress={(day) => handleDayPress(day.dateString)}
            enableSwipeMonths
            theme={{
              calendarBackground: 'transparent',
              textSectionTitleColor: '#9CA3AF',
              dayTextColor: '#111827',
              todayTextColor: ACCENT,
              arrowColor: ACCENT,
              monthTextColor: '#111827',
              textMonthFontWeight: '800',
              textMonthFontSize: 15,
              textDayFontWeight: '600',
              textDayHeaderFontWeight: '700',
              textDayFontSize: 14,
            }}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    overflow: 'hidden',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  range: { fontSize: 14.5, fontWeight: '700', color: '#111827', marginTop: 1 },
  daysBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  daysText: { fontSize: 11.5, fontWeight: '800', color: '#4B5563' },
  calendarWrapper: {
    backgroundColor: '#FFFFFF',
    margin: 6,
    marginTop: 0,
    borderRadius: 12,
    paddingBottom: 4,
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    paddingTop: 10,
  },
})

export default DateRangeField
