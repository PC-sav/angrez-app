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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppSelector } from '../../store/hooks';
import { api } from '../../api';
import { AUTH } from '../../copy/auth';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Phone'>;

export function PhoneScreen() {
  const navigation = useNavigation<Nav>();
  const [phone, setPhone]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Shown when Bootstrap detected INVALID_TOKEN and bounced the user back
  const reloginReason = useAppSelector((state) => state.ui.toastMessage);

  const valid = phone.length === 10 && /^\d{10}$/.test(phone);

  const handleSubmit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.auth.requestOtp({ phone });
      navigation.navigate('Otp', { phone, devOtp: data?.devOtp });
    } catch {
      setError(AUTH.otp.rateLimited);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.logo}>अंग्रेज़</Text>
          <Text style={styles.title}>{AUTH.phone.title}</Text>
          <Text style={styles.subtitle}>
            {reloginReason ?? AUTH.phone.subtitle}
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              placeholder={AUTH.phone.placeholder}
              placeholderTextColor="#BBB"
              keyboardType="number-pad"
              maxLength={10}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              autoFocus
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.button, (!valid || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!valid || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{AUTH.phone.button}</Text>
            }
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
    gap: 12,
  },
  logo: {
    fontSize: 44,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DDD',
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: '#F0F0F0',
    borderRightWidth: 1,
    borderRightColor: '#DDD',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1A2E',
    paddingHorizontal: 14,
    paddingVertical: 16,
    letterSpacing: 2,
  },
  errorText: {
    fontSize: 13,
    color: '#E07B39',
    textAlign: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#4A90D9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
