// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
// import React from 'react'
// import Home from '../Homepage/Homepage'
// import Settings from '../Settings/Settings'
// import { Text, TouchableOpacity } from 'react-native'
// import { Icon } from 'react-native-elements'
// import { NavigationItem } from './types'
// import { View } from 'react-native'

// const Tab = createBottomTabNavigator()

// const options = {
//   tabBarShowLabel: false,
// }

// const CustomTabBar = () => {
//   return (
//     <View style={{ backgroundColor: 'red', height: 40 }}>
//       <Text>AAA</Text>
//       <Tab.Screen
//         key={navigationItems[0].label}
//         name={navigationItems[0].path}
//         component={navigationItems[0].component}
//         options={{
//           ...options,
//           title: navigationItems[0].label,
//           tabBarButton: navigationItems[0].tabBarButton,
//         }}
//       />
//       {navigationItems.map((item: NavigationItem) => (
//         <Tab.Screen
//           key={item.label}
//           name={item.path}
//           component={item.component}
//           options={{
//             ...options,
//             title: item.label,
//             tabBarButton: item.tabBarButton,
//           }}
//         />
//       ))}
//     </View>
//   )
// }

// const BottomNavigation = () => {
//   return (
//     <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={CustomTabBar}>
//       {navigationItems.map((item: NavigationItem) => (
//         <Tab.Screen
//           key={item.label}
//           name={item.path}
//           component={item.component}
//           options={{
//             ...options,
//             title: item.label,
//             tabBarButton: item.tabBarButton,
//           }}
//         />
//       ))}
//     </Tab.Navigator>
//   )
// }

// export default BottomNavigation

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import Home from '../Homepage/Homepage'
import Settings from '../Settings/Settings'
import { NavigationItem, TabBarIcon } from './types'

const navigationItems: NavigationItem[] = [
  {
    label: 'Home',
    path: 'components/Homepage/Homepage',
    component: Home,
    icon: {
      default: 'home',
      active: 'home-outline',
    },
  },
  {
    label: 'Settings',
    path: 'components/Settings/Settings',
    component: Settings,
    icon: {
      default: 'settings',
      active: 'settings-outline',
    },
  },
]

const getTabBarIcon = ({ focused, color, size, route }: TabBarIcon) => {
  const selectedRoute = navigationItems.find((item) => item.path === route.name)
  const iconName = selectedRoute.icon[focused ? 'active' : 'default']

  return <Ionicons name={iconName} size={size} color={color} />
}

const Tab = createBottomTabNavigator()

const BottomNavigation = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) =>
          getTabBarIcon({ color, size, focused, route }),
      })}
    >
      {navigationItems.map((item: NavigationItem) => (
        <Tab.Screen
          key={item.label}
          name={item.path}
          component={item.component}
          options={{
            tabBarShowLabel: false,
            title: item.label,
            tabBarActiveTintColor: 'tomato',
            tabBarInactiveTintColor: 'gray',
          }}
        />
      ))}
    </Tab.Navigator>
  )
}

export default BottomNavigation
