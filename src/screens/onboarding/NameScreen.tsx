import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AUTH } from '../../copy/auth';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'OnboardingName'>;

export function NameScreen() {
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');

  const advance = (resolvedName: string | null) =>
    navigation.navigate('OnboardingGoal', { name: resolvedName });

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.step}>1 / 3</Text>
          <Text style={styles.title}>{AUTH.onboarding.nameTitle}</Text>
          <Text style={styles.subtitle}>{AUTH.onboarding.nameSubtitle}</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={AUTH.onboarding.namePlaceholder}
            placeholderTextColor="#BBB"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => advance(name.trim() || null)}
          />

          <Pressable
            style={styles.button}
            onPress={() => advance(name.trim() || null)}
          >
            <Text style={styles.buttonText}>{AUTH.onboarding.nameNext}</Text>
          </Pressable>

          <Pressable onPress={() => advance(null)}>
            <Text style={styles.skip}>{AUTH.onboarding.nameSkip}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F5F0EB' },
  flex:    { flex: 1 },
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DDD',
    fontSize: 18,
    color: '#1A1A2E',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  button: {
    width: '100%',
    backgroundColor: '#4A90D9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  skip: {
    fontSize: 14,
    color: '#AAA',
    fontWeight: '500',
    marginTop: 4,
  },
});
