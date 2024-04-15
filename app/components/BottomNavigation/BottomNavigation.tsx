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
        headerShown: false,
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
