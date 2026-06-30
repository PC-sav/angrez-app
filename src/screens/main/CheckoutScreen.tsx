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
  // Runs once when phase transitions to 'polling'.
  // Two terminal states: ACTIVE (webhook landed before attempts exhausted),
  // PROCESSING (attempts exhausted without active — ambiguous, never 'failed').
  // A clean 200 with status !== 'active' is normal in-flight state; keep polling.
  useEffect(() => {
    if (phase !== 'polling') return;

    let cancelled = false;
    let attempts  = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function runPoll() {
      if (cancelled) return;
      attempts += 1; // every call consumes an attempt, including 503 — no infinite loop

      try {
        const { data } = await api.subscription.get();
        if (cancelled) return;

        if (data === null) {
          // 503: axios interceptor resolved with {data:null} after its own retries.
          // attempt was already consumed above — a persistent 503 reaches MAX_POLLS
          // and falls through to 'processing', never loops forever.
          if (attempts < MAX_POLLS) {
            timer = setTimeout(runPoll, POLL_INTERVAL_MS);
          } else {
            setResult('processing');
            setPhase('done');
          }
          return;
        }

        if (data.status === 'active') {
          dispatch(setSubscription({
            plan: data.plan,
            status: data.status,
            current_period_end: data.current_period_end,
          }));
          setResult('active');
          setPhase('done');
          return;
        }

        // Clean non-active (e.g. 'none' | 'expired') — webhook hasn't landed yet.
        if (attempts >= MAX_POLLS) {
          setResult('processing');
          setPhase('done');
          return;
        }
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

  // ── 'done' phase — minimal gate UI (Block 4 replaces with full result screen) ──
  if (phase === 'done') {
    const icon  = result === 'active' ? '✓' : result === 'processing' ? '⏳' : '✗';
    const title =
      result === 'active'     ? 'पेमेंट सफल!'       :
      result === 'processing' ? 'पेमेंट जाँच रही है' :
                                'पेमेंट नहीं हुई';
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.resultIcon}>{icon}</Text>
          <Text style={styles.resultTitle}>{title}</Text>
          <Pressable style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>ठीक है</Text>
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

  resultIcon:  { fontSize: 48 },
  resultTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  doneButton: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  doneButtonText: { fontSize: 16, fontWeight: '700', color: colors.surface },
});
