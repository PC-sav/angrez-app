import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OtpScreen } from '../screens/auth/OtpScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Otp" component={OtpScreen} />
    </Stack.Navigator>
  );
}
