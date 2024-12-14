import { Dispatch, SetStateAction, useState } from 'react'
import { Location } from '../types'
import TextField from '../../../FormElements/TextField'
import {
  Linking,
  Platform,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { t } from '../../../../translations'
import { TranslationsKeys } from '../../../../translations/types'

const accessToken =
  'pk.eyJ1IjoiY29udGlsb3JlbnpvIiwiYSI6ImNtNDRmeWI4YTBqdDYya3F4cjNnNnZyMHYifQ.zm7asY75UDwNa6o_Le3GgQ'
const sessionToken = 'session123456'

const LocationField = ({ location, setLocation }: Props) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isEditing, setIsEditing] = useState(location ? false : true)

  const onLocationSearch = async (query) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/suggest?q=${query}&access_token=${accessToken}&session_token=${sessionToken}&limit=5&language=IT`
      )
      const data = await response.json()
      setSearchResults(data.suggestions)
    } catch (error) {
      console.error(error)
    }
  }

  const getLocationData = async (id: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${id}?access_token=${accessToken}&session_token=${sessionToken}&language=IT`
      )
      const data = await response.json()
      const locationData = data.features[0]

      setLocation({
        name: locationData.properties.name,
        address: locationData.properties.full_address,
        coordinates: {
          lat: locationData.geometry.coordinates[0],
          lng: locationData.geometry.coordinates[1],
        },
      })

      setIsEditing(false)
      setSearchQuery('')
    } catch (error) {
      console.error(error)
    }
  }

  const openInMapsApp = (location: Location) => {
    const address = location.address
    const coordinatesString = `${location.coordinates.lat},${location.coordinates.lng}`

    const url = Platform.select({
      ios: `maps:${coordinatesString}?q=${address}`,
      android: `geo:${coordinatesString}?q=${address}`,
    })

    Linking.openURL(url)
  }

  return (
    <>
      {isEditing && (
        <View>
          <View style={searchStyles}>
            <View style={textFieldStyles}>
              <TextField
                label={t(TranslationsKeys.location)}
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </View>

            <TouchableOpacity
              disabled={!searchQuery}
              style={searchButtonStyles}
              onPress={() => onLocationSearch(searchQuery)}
            >
              <Ionicons name="search" style={searchIconStyles} />
            </TouchableOpacity>
          </View>

          <View style={resultsListStyles}>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={result.name + '_' + index}
                onPress={() => {
                  setSearchResults([])
                  getLocationData(result.mapbox_id)
                }}
                style={searchResultStyles}
                disabled={!searchQuery}
              >
                <Text>
                  {result.name}, {result.place_formatted}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {location && (
        <View style={locationContainerStyles}>
          <Text>📍</Text>
          <Text style={locationStyles} onPress={() => openInMapsApp(location)}>
            {location?.name} - {location?.address}
          </Text>
          <Ionicons
            name="create-outline"
            style={locationIconStyles}
            onPress={() => setIsEditing(!isEditing)}
          />
        </View>
      )}
    </>
  )
}

const searchStyles: ViewStyle = {
  alignItems: 'flex-end',
  display: 'flex',
  flexDirection: 'row',
  width: '100%',
}

const searchButtonStyles: ViewStyle = {
  alignItems: 'center',
  aspectRatio: 1,
  backgroundColor: 'tomato',
  borderBottomRightRadius: 8,
  borderTopRightRadius: 8,
  display: 'flex',
  height: 39,
  justifyContent: 'center',
}

const textFieldStyles: ViewStyle = {
  flexGrow: 1,
}

const searchResultStyles: ViewStyle = {
  backgroundColor: 'white',
  borderBottomColor: 'whitesmoke',
  borderBottomWidth: 1,
  padding: 8,
}

const resultsListStyles: ViewStyle = {
  backgroundColor: 'white',
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.1,
  shadowRadius: 4,
}

const searchIconStyles: TextStyle = {
  color: 'white',
  fontSize: 18,
}

const locationContainerStyles: ViewStyle = {
  alignItems: 'center',
  flexDirection: 'row',
  gap: 2,
  justifyContent: 'flex-start',
  width: '100%',
}

const locationStyles: TextStyle = {
  color: 'darkblue',
  maxWidth: '90%',
  textDecorationLine: 'underline',
}

const locationIconStyles: TextStyle = {
  color: 'darkblue',
  fontSize: 16,
  padding: 4,
}

export default LocationField

interface Props {
  location?: Location
  setLocation: Dispatch<SetStateAction<Location>>
}
