import React, { useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  ActivityIndicator, Linking, Alert, SafeAreaView,
} from 'react-native';
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

// Phase transitions:
//   webview  →  (sentinel or AppState-resume)  →  polling   [Block 3 fills in poll loop]
//   polling  →  (poll resolves)                →  done      [Block 4 fills in result UI]
type Phase = 'webview' | 'polling';

export function CheckoutScreen({ route, navigation }: Props) {
  const { payment_session_id, order_id, plan, amount } = route.params;

  const [phase, setPhase] = useState<Phase>('webview');
  const webViewRef  = useRef<WebView>(null);
  const sentinelRef = useRef(false); // guard: sentinel fires exactly once

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
    // Block 3's AppState-resume backstop handles the return path.
    if (UPI_SCHEME_RE.test(url)) {
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

  // ── Polling phase ─────────────────────────────────────────────────────────
  // Block 3 replaces this stub with the actual GET /api/subscription poll loop,
  // AppState-resume listener, and three honest result states.
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
});
