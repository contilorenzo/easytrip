import { View, Text, LogBox } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import 'react-native-reanimated'
import 'react-native-gesture-handler'

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
])

const Home = () => {
  return (
    <NavigationContainer independent>
      <SafeAreaView>
        <View style={{ padding: '10px' }}>
          <Text>Welcome</Text>
        </View>
      </SafeAreaView>
    </NavigationContainer>
  )
}

export default Home
