import { View, ScrollView, Text, LogBox } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
])

const Home = () => {
  return (
    <NavigationContainer independent>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flex: 1, padding: '10px' }}>
            <Text>Welcome</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </NavigationContainer>
  )
}

export default Home
