import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useAppDispatch } from '../../store/hooks';
import { mergeUser, setLoggedIn } from '../../store/slices/userSlice';
import { api, saveToken } from '../../api';
import { AUTH } from '../../copy/auth';
import type { AuthStackParamList } from '../../navigation/types';

type Nav   = NativeStackNavigationProp<AuthStackParamList, 'Otp'>;
type Route = RouteProp<AuthStackParamList, 'Otp'>;

const RESEND_SECONDS = 30;

export function OtpScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const dispatch   = useAppDispatch();

  const { phone, devOtp, referral_code } = route.params;

  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);

  // Auto-fill dev OTP when present (stub mode only — self-disables at launch)
  useEffect(() => {
    if (devOtp) setCode(devOtp);
  }, [devOtp]);

  // 30-second resend cooldown
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((s) => {
        if (s <= 1) { setCanResend(true); clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      // Pass regardless of isNewUser — the server decides eligibility.
      // Key omitted entirely when empty (never referral_code: '').
      const { data } = await api.auth.verifyOtp({
        phone,
        code,
        ...(referral_code ? { referral_code } : {}),
      });
      await saveToken(data.token);
      dispatch(mergeUser(data.user));
      if (data.isNewUser) {
        navigation.navigate('OnboardingName');
      } else {
        dispatch(setLoggedIn());
      }
    } catch (err: any) {
      const errCode: string = err?.response?.data?.error?.code ?? '';
      if (errCode === 'UNAUTHORIZED') {
        setMessage(AUTH.otp.wrongCode);
      } else {
        setMessage(AUTH.otp.rateLimited);
      }
    } finally {
      setLoading(false);
    }
  }, [code, phone, referral_code, loading, dispatch, navigation]);

  const handleResend = useCallback(async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(RESEND_SECONDS);
    setMessage(null);
    try {
      const { data } = await api.auth.requestOtp({ phone });
      if (data?.devOtp) setCode(data.devOtp);
      // restart countdown
      const id = setInterval(() => {
        setCountdown((s) => {
          if (s <= 1) { setCanResend(true); clearInterval(id); return 0; }
          return s - 1;
        });
      }, 1000);
    } catch {
      setMessage(AUTH.otp.rateLimited);
      setCanResend(true);
    }
  }, [canResend, phone]);

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{AUTH.otp.title}</Text>
          <Text style={styles.subtitle}>{AUTH.otp.subtitle(phone)}</Text>

          {devOtp && (
            <View style={styles.devBadge}>
              <Text style={styles.devText}>
                {AUTH.otp.devLabel} <Text style={styles.devCode}>{devOtp}</Text>
              </Text>
            </View>
          )}

          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
            placeholder="• • • • • •"
            placeholderTextColor="#CCC"
            textAlign="center"
            autoFocus={!devOtp}
          />

          {message && <Text style={styles.message}>{message}</Text>}

          <Pressable
            style={[styles.button, (code.length !== 6 || loading) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={code.length !== 6 || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{AUTH.otp.button}</Text>
            }
          </Pressable>

          <Pressable onPress={handleResend} disabled={!canResend}>
            <Text style={[styles.resend, !canResend && styles.resendDisabled]}>
              {canResend
                ? AUTH.otp.resend
                : AUTH.otp.resendWait(countdown)
              }
            </Text>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  devBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  devText: {
    fontSize: 13,
    color: '#795548',
  },
  devCode: {
    fontWeight: '700',
    letterSpacing: 2,
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DDD',
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A2E',
    paddingVertical: 18,
    letterSpacing: 10,
  },
  message: {
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
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resend: {
    fontSize: 14,
    color: '#4A90D9',
    fontWeight: '600',
    marginTop: 4,
  },
  resendDisabled: {
    color: '#AAA',
  },
});
