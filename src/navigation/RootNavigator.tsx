import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../store/hooks';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { Bootstrap } from '../screens/Bootstrap';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const bootstrapped = useAppSelector((state) => state.ui.bootstrapped);
  const isLoggedIn   = useAppSelector((state) => state.user.isLoggedIn);

  // Always run the cold-start token check before showing any screen
  if (!bootstrapped) {
    return <Bootstrap />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isLoggedIn ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
