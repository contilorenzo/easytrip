import { AutocompleteDropdownItem } from 'react-native-autocomplete-dropdown'

// Elenco dei paesi (codice ISO minuscolo → nome in italiano), lo stesso dei codici delle bandiere
export const getCountriesOptions = async (): Promise<AutocompleteDropdownItem[]> => {
  try {
    const res = await fetch('https://flagcdn.com/it/codes.json')
    const countriesObj = await res.json()
    return Object.entries(countriesObj).map(([key, value]) => ({
      id: key,
      title: String(value ?? ''),
    }))
  } catch (error) {
    console.error('Failed to load countries:', error)
    return []
  }
}
