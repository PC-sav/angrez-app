import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  ActivityIndicator, Linking, Alert, SafeAreaView, AppState,
} from 'react-native';
import { useAppDispatch } from '../../store/hooks';
import { setSubscription } from '../../store/slices/subscriptionSlice';
import { api } from '../../api';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { MAIN } from '../../copy/main';

export type CheckoutParams = MainStackParamList['Checkout'];
type Props = NativeStackScreenProps<MainStackParamList, 'Checkout'>;

// Non-http schemes that must be handed to the OS instead of loaded in the WebView.
const UPI_SCHEME_RE = /^(upi|intent|phonepe|tez|paytmmp):/i;

// Cashfree Web SDK v3 bootstrap.
// Embeds the payment_session_id at render time; never user-controlled input.
// redirectTarget:'_self' causes the SDK to navigate the current window to
// Cashfree's hosted checkout page — that redirect is allowed by onShouldStartLoadWithRequest.
function buildBootstrapHtml(sessionId: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
</head>
<body style="margin:0;background:${colors.background};">
<script>
window.onload = function() {
  if (typeof Cashfree === 'undefined') return;
  Cashfree({ mode: "sandbox" }).checkout({
    paymentSessionId: "${sessionId}",
    redirectTarget: "_self"
  });
};
</script>
</body></html>`;
}

type PollResult = 'active' | 'processing' | 'failed';
type Phase = 'webview' | 'polling' | 'done';

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 12;

export function CheckoutScreen({ route, navigation }: Props) {
  const { payment_session_id, order_id, plan, amount } = route.params;

  const dispatch = useAppDispatch();

  const [phase, setPhase]   = useState<Phase>('webview');
  const [result, setResult] = useState<PollResult | null>(null);

  const webViewRef      = useRef<WebView>(null);
  const sentinelRef     = useRef(false); // guard: sentinel fires exactly once
  const upiLinkFiredRef = useRef(false); // AppState backstop: only poll on resume if UPI was opened

  // Called by both onShouldStartLoadWithRequest (primary) and
  // onNavigationStateChange (backup). Sets phase to 'polling' once.
  function handleSentinel() {
    if (sentinelRef.current) return;
    sentinelRef.current = true;
    setPhase('polling');
  }

  // ── onShouldStartLoadWithRequest ──────────────────────────────────────────
  // PRIMARY sentinel + UPI intercept. Returning false blocks the navigation.
  // originWhitelist={['*']} ensures this fires for every URL, including upi://.
  function handleShouldStartLoad(request: ShouldStartLoadRequest): boolean {
    const { url } = request;

    // Sentinel: Cashfree redirects here after payment (success or failure).
    // The route 404s on the server — block it and use it as a signal only.
    if (url.includes('/payment/complete')) {
      handleSentinel();
      return false;
    }

    // UPI deep links: hand to the OS so the payment app can open.
    // Set upiLinkFiredRef so the AppState-resume backstop knows to start polling on return.
    if (UPI_SCHEME_RE.test(url)) {
      upiLinkFiredRef.current = true;
      Linking.openURL(url).catch(() => {
        console.warn('[Checkout] Linking.openURL failed for scheme:', url.split(':')[0]);
      });
      return false;
    }

    return true;
  }

  // ── onNavigationStateChange ───────────────────────────────────────────────
  // BACKUP sentinel. onShouldStartLoadWithRequest blocks the navigation; this
  // catches the edge case where that callback fires late (after load starts).
  function handleNavigationStateChange(navState: WebViewNavigation) {
    if (navState.url.includes('/payment/complete')) {
      webViewRef.current?.stopLoading();
      handleSentinel();
    }
  }

  function handleWebViewError() {
    if (phase !== 'webview') return;
    Alert.alert(
      'लोड नहीं हो सका',
      'पेमेंट पेज नहीं खुला। दोबारा कोशिश करें?',
      [
        { text: 'रद्द करें', style: 'cancel', onPress: () => navigation.goBack() },
        { text: 'फिर कोशिश करें', onPress: () => webViewRef.current?.reload() },
      ],
    );
  }

  function handleClose() {
    Alert.alert(
      'पेमेंट छोड़ें?',
      'वापस जाने पर यह ऑर्डर रद्द हो जाएगा।',
      [
        { text: 'जारी रखें', style: 'cancel' },
        { text: 'छोड़ें', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  }

  // ── Poll loop ─────────────────────────────────────────────────────────────
  // Each tick fetches both /api/subscription and /api/payments/order/:id in parallel.
  //
  // Resolution priority (in order):
  //   1. subscription.status === 'active'           → ACTIVE   (highest — money confirmed)
  //   2. order.status === 'FAILED' | 'DROPPED'      → FAILED   (only source of 'failed')
  //   3. budget exhausted                           → PROCESSING (never 'failed' on timeout)
  //   4. otherwise (CREATED, or either 503)         → keep polling
  //
  // A PAID order that outlasts the poll budget → PROCESSING, never FAILED.
  // setResult('failed') appears in EXACTLY ONE place: the FAILED/DROPPED branch below.
  useEffect(() => {
    if (phase !== 'polling') return;

    let cancelled = false;
    let attempts  = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function runPoll() {
      if (cancelled) return;
      attempts += 1; // consumed unconditionally — persistent 503 drains to PROCESSING

      try {
        const [subRes, orderRes] = await Promise.all([
          api.subscription.get(),
          api.payments.orderStatus(order_id),
        ]);
        if (cancelled) return;

        const subData   = subRes.data;
        const orderData = orderRes.data;

        // Priority 1: subscription active — entitlement live, regardless of order status.
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

        // Priority 2: order definitively rejected — stop immediately.
        // THIS IS THE ONLY PLACE setResult('failed') IS CALLED.
        if (
          orderData !== null &&
          (orderData.status === 'FAILED' || orderData.status === 'DROPPED')
        ) {
          setResult('failed');
          setPhase('done');
          return;
        }

        // Priority 3: budget exhausted — ambiguous (webhook in-flight, or PAID but sub
        // propagating). Money may have been captured; 'processing' is the honest answer.
        if (attempts >= MAX_POLLS) {
          setResult('processing');
          setPhase('done');
          return;
        }

        // CREATED or either endpoint 503'd (data === null) — keep polling.
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
  }, [phase, dispatch, order_id]);

  // ── AppState backstop ──────────────────────────────────────────────────────
  // When a UPI deep link fires, the user leaves the app. On return, if the sentinel
  // hasn't already fired (e.g. Cashfree redirect didn't reach us), trigger polling.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && upiLinkFiredRef.current) {
        handleSentinel();
      }
    });
    return () => sub.remove();
  // handleSentinel is stable (only touches refs + setPhase); empty deps is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 'done' phase ──────────────────────────────────────────────────────────
  if (phase === 'done') {
    const isActive     = result === 'active';
    const isProcessing = result === 'processing';

    // Icon character and accent color — all tokens, zero hardcoded hex.
    const iconChar    = isActive ? '✓' : isProcessing ? '⏳' : '○';
    const accentColor = isActive ? colors.success : isProcessing ? colors.warning : colors.textSecondary;
    // CTA background: success green for active; primary blue for processing/failed (neutral action).
    const ctaColor    = isActive ? colors.success : colors.primary;

    const copy = isActive
      ? MAIN.checkout.result.active
      : isProcessing
      ? MAIN.checkout.result.processing
      : MAIN.checkout.result.failed;

    // active: clear both Checkout + Paywall modals, land on Ghar.
    // processing / failed: go back to Paywall so user can retry or dismiss.
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

  // ── Polling phase ─────────────────────────────────────────────────────────
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

  // ── WebView phase ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Text style={styles.closeLabel}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>₹{amount} • {plan}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ html: buildBootstrapHtml(payment_session_id), baseUrl: 'https://sandbox.cashfree.com' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigationStateChange}
        onError={handleWebViewError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeLabel:   { fontSize: 18, color: colors.textSecondary, fontWeight: '600' },
  headerTitle:  { fontSize: 15, fontWeight: '700', color: colors.text },
  headerSpacer: { width: 24 }, // mirrors close-button width so title is visually centred

  webview: { flex: 1 },

  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  resultIconChar:  { fontSize: 32, fontWeight: '700' },
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
