import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../store/hooks';
import { LanguagePickScreen } from '../screens/auth/LanguagePickScreen';
import { PhoneScreen } from '../screens/auth/PhoneScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { NameScreen } from '../screens/onboarding/NameScreen';
import { GoalScreen } from '../screens/onboarding/GoalScreen';
import { DailyTimeScreen } from '../screens/onboarding/DailyTimeScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const language = useAppSelector((state) => state.user.language);

  // Fresh install (no language) → Language Pick; returning user → Phone
  const initialRoute: keyof AuthStackParamList = language ? 'Phone' : 'LanguagePick';

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="LanguagePick"       component={LanguagePickScreen} />
      <Stack.Screen name="Phone"              component={PhoneScreen} />
      <Stack.Screen name="Otp"               component={OtpScreen} />
      <Stack.Screen name="OnboardingName"     component={NameScreen} />
      <Stack.Screen name="OnboardingGoal"     component={GoalScreen} />
      <Stack.Screen name="OnboardingDailyTime" component={DailyTimeScreen} />
    </Stack.Navigator>
  );
}
