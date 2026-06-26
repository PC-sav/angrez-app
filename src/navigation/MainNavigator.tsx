import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { LessonModal } from '../screens/lesson/LessonModal';
import { PaywallScreen } from '../screens/main/PaywallScreen';
import { WebViewSmokeTest } from '../screens/dev/WebViewSmokeTest';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="LessonModal"
        component={LessonModal}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="WebViewSmokeTest" component={WebViewSmokeTest} />
    </Stack.Navigator>
  );
}
