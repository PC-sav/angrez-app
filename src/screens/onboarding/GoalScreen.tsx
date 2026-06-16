import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { AUTH } from '../../copy/auth';
import type { AuthStackParamList } from '../../navigation/types';

type Nav   = NativeStackNavigationProp<AuthStackParamList, 'OnboardingGoal'>;
type Route = RouteProp<AuthStackParamList, 'OnboardingGoal'>;

export function GoalScreen() {
  const navigation = useNavigation<Nav>();
  const { name }   = useRoute<Route>().params;
  const [selected, setSelected] = useState<string | null>(null);

  const advance = () => {
    if (!selected) return;
    navigation.navigate('OnboardingDailyTime', { name, goal: selected });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.step}>2 / 3</Text>
        <Text style={styles.title}>{AUTH.onboarding.goalTitle}</Text>

        <View style={styles.options}>
          {AUTH.onboarding.goals.map((g) => (
            <Pressable
              key={g.slug}
              style={[styles.option, selected === g.slug && styles.optionSelected]}
              onPress={() => setSelected(g.slug)}
            >
              <Text style={[styles.optionText, selected === g.slug && styles.optionTextSelected]}>
                {g.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={advance}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>{AUTH.onboarding.goalNext}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F0EB' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  step: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  options: { width: '100%', gap: 10 },
  option: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DDD',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  optionSelected: {
    borderColor: '#4A90D9',
    backgroundColor: '#EEF5FD',
  },
  optionText: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
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
