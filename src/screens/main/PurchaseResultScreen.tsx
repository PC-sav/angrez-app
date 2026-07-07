import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppDispatch } from '../../store/hooks';
import { setSubscription } from '../../store/slices/subscriptionSlice';
import { api } from '../../api';
import type { MainStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { MAIN } from '../../copy/main';

type Props = NativeStackScreenProps<MainStackParamList, 'PurchaseResult'>;

// Google Play Billing result screen (D1c Block 2). Unlike CheckoutScreen (Cashfree),
// there is no order_id / order-status signal — a purchase failure is caught earlier
// by the billing error callback (PaywallScreen), before this screen is ever reached.
// This screen only ever resolves to 'active' or 'processing', never 'failed' —
// setResult('failed') stays single-occurrence in CheckoutScreen (P0.5/invariant #3).
//
// Copy and 'done'-phase rendering are intentionally identical to CheckoutScreen's
// active/processing states (MAIN.checkout.result) — same visual outcome, per the
// D1c brief's "existing /api/subscription poll → active or timeout→processing,
// unchanged screens."

type PollResult = 'active' | 'processing';
type Phase = 'polling' | 'done';

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 12;

export function PurchaseResultScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();

  const [phase, setPhase] = useState<Phase>('polling');
  const [result, setResult] = useState<PollResult | null>(null);

  useEffect(() => {
    if (phase !== 'polling') return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function runPoll() {
      if (cancelled) return;
      attempts += 1; // consumed unconditionally — persistent 503 drains to PROCESSING

      try {
        const { data: subData } = await api.subscription.get();
        if (cancelled) return;

        if (subData !== null && subData.status === 'active') {
          dispatch(setSubscription({
            plan: subData.plan,
            status: subData.status,
            current_period_end: subData.current_period_end,
          }));
          setResult('active');
          setPhase('done');
          return;
        }

        if (attempts >= MAX_POLLS) {
          setResult('processing');
          setPhase('done');
          return;
        }

        // Not yet active (RTDN/webhook in flight), or a 503 (data === null) — keep polling.
        timer = setTimeout(runPoll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        if (attempts < MAX_POLLS) {
          timer = setTimeout(runPoll, POLL_INTERVAL_MS);
        } else {
          setResult('processing');
          setPhase('done');
        }
      }
    }

    runPoll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, dispatch]);

  if (phase === 'polling') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.pollingText}>पेमेंट की जाँच हो रही है…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = result === 'active';
  const iconChar = isActive ? '✓' : '⏳';
  const accentColor = isActive ? colors.success : colors.warning;
  const ctaColor = isActive ? colors.success : colors.primary;
  const copy = isActive ? MAIN.checkout.result.active : MAIN.checkout.result.processing;
  const handleCta = isActive
    ? () => navigation.navigate('Tabs')
    : () => navigation.goBack();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={[styles.resultIconRing, { borderColor: accentColor }]}>
          <Text style={[styles.resultIconChar, { color: accentColor }]}>{iconChar}</Text>
        </View>
        <Text style={styles.resultHeadline}>{copy.headline}</Text>
        <Text style={styles.resultSubtext}>{copy.subtext}</Text>
        <Pressable style={[styles.resultCta, { backgroundColor: ctaColor }]} onPress={handleCta}>
          <Text style={styles.resultCtaText}>{copy.cta}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  pollingText: { fontSize: 16, fontWeight: '600', color: colors.text },

  resultIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconChar: { fontSize: 32, fontWeight: '700' },
  resultHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  resultSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  resultCta: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  resultCtaText: { fontSize: 16, fontWeight: '700', color: colors.surface },
});
