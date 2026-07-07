import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { LessonModal } from '../screens/lesson/LessonModal';
import { PaywallScreen } from '../screens/main/PaywallScreen';
import { CheckoutScreen } from '../screens/main/CheckoutScreen';
import { PurchaseResultScreen } from '../screens/main/PurchaseResultScreen';
import { WebViewSmokeTest } from '../screens/dev/WebViewSmokeTest';
import { BillingDevTest } from '../screens/dev/BillingDevTest';
import { CHECKOUT_PROVIDER } from '../config';
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
      {/* CHECKOUT_PROVIDER gate (P0.4): Checkout (Cashfree WebView) is unreachable
          in the Play build — the route itself isn't registered, not just unused. */}
      {CHECKOUT_PROVIDER === 'cashfree' && (
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
      )}
      <Stack.Screen
        name="PurchaseResult"
        component={PurchaseResultScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="WebViewSmokeTest" component={WebViewSmokeTest} />
      <Stack.Screen name="BillingDevTest" component={BillingDevTest} />
    </Stack.Navigator>
  );
}
