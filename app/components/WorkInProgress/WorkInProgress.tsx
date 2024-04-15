import { Text, TextStyle, View, ViewStyle } from 'react-native'

const WorkInProgress = ({ text }: { text: string }) => {
  return (
    <View style={wrapperStyle}>
      <Text style={textStyle}>{text}</Text>
    </View>
  )
}

const wrapperStyle: ViewStyle = {
  alignItems: 'center',
  height: '100%',
  justifyContent: 'center',
}

const textStyle: TextStyle = {
  color: 'rgba(0,0,0, 0.5)',
}

export default WorkInProgress
