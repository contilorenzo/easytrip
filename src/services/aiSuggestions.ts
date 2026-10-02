import { supabase } from './supabase'

export interface StepSuggestion {
  id: string
  day: number
  type: 'visit' | 'food'
  title: string
  placeName: string
  address: string
  lat: number
  lng: number
  startHour: number
  startMinute: number
  durationMinutes: number
  description: string
}

export interface SuggestionRequest {
  city: string
  country: string
  days: number
  styles: string[]
  // Distanza massima dal centro della città entro cui cercare le tappe
  radiusKm: number
}

export const fetchStepSuggestions = async (request: SuggestionRequest): Promise<StepSuggestion[]> => {
  const { data, error } = await supabase.functions.invoke('suggest-steps', { body: request })

  if (error) {
    // Per gli errori HTTP la funzione restituisce { error } nel corpo della risposta
    let message = error.message
    try {
      const body = await (error as any).context?.json?.()
      if (body?.error) message = body.detail ? `${body.error} (${body.detail})` : body.error
    } catch {
      // uso il messaggio generico
    }
    throw new Error(message)
  }

  const suggestions: Omit<StepSuggestion, 'id'>[] = data?.suggestions ?? []
  return suggestions.map((s, index) => ({ ...s, id: `${index}_${s.placeName}` }))
}
