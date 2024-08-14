import { Image } from 'react-native'

const CountryFlag = ({
  countryCode,
  height = 20,
  width,
  isCircle,
  borderRadius,
}: Props) => (
  <Image
    source={{
      uri: `https://flagcdn.com/w320/${countryCode}.webp`,
      height: height,
      width: width ?? height,
    }}
    style={{
      resizeMode: 'cover',
      borderRadius: borderRadius ?? isCircle ? height / 2 : 0,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
    }}
  />
)

interface Props {
  countryCode: string
  height: number
  width?: number
  isCircle?: boolean
  borderRadius?: number
}

export default CountryFlag
