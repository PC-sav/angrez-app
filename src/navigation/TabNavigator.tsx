import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { GharScreen } from '../screens/main/GharScreen';
import { SafarScreen } from '../screens/main/SafarScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(on: IoniconName, off: IoniconName) {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? on : off} size={size} color={color} />
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4A90D9',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Ghar"
        component={GharScreen}
        options={{ tabBarLabel: 'घर', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tab.Screen
        name="Safar"
        component={SafarScreen}
        options={{ tabBarLabel: 'सफ़र', tabBarIcon: tabIcon('map', 'map-outline') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'प्रोफ़ाइल', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tab.Navigator>
  );
}
