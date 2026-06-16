import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAppDispatch } from '../../store/hooks';
import { setOnboarding, setLoggedIn } from '../../store/slices/userSlice';
import { AUTH } from '../../copy/auth';
import type { AuthStackParamList } from '../../navigation/types';

type Route = RouteProp<AuthStackParamList, 'OnboardingDailyTime'>;

export function DailyTimeScreen() {
  const { name, goal } = useRoute<Route>().params;
  const dispatch = useAppDispatch();
  const [selected, setSelected] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);

  const handleStart = async () => {
    if (!selected || finishing) return;
    setFinishing(true);
    dispatch(setOnboarding({ name, goal, daily_time: selected }));
    // Brief warm welcome before routing to Ghar
    await new Promise<void>((r) => setTimeout(r, 1200));
    dispatch(setLoggedIn());
  };

  if (finishing) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.welcome}>
          <Text style={styles.welcomeText}>{AUTH.onboarding.welcome}</Text>
          <ActivityIndicator color="#4A90D9" style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.step}>3 / 3</Text>
        <Text style={styles.title}>{AUTH.onboarding.dailyTitle}</Text>

        <View style={styles.options}>
          {AUTH.onboarding.dailyOptions.map((opt) => (
            <Pressable
              key={opt.minutes}
              style={[styles.option, selected === opt.minutes && styles.optionSelected]}
              onPress={() => setSelected(opt.minutes)}
            >
              <Text style={[styles.optionText, selected === opt.minutes && styles.optionTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>{AUTH.onboarding.dailyNext}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0EB' },
  welcome: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  step: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  options: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  option: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DDD',
    paddingVertical: 20,
    alignItems: 'center',
  },
  optionSelected: {
    borderColor: '#4A90D9',
    backgroundColor: '#EEF5FD',
  },
  optionText: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#1A1A2E',
    fontWeight: '700',
  },
  button: {
    width: '100%',
    backgroundColor: '#4A90D9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
