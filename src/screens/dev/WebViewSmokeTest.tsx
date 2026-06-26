import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MainStackParamList } from '../../navigation/types';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'WebViewSmokeTest'>;

const SMOKE_HTML = '<html><body style="background:#f5f0eb;font-family:sans-serif;padding:40px"><h1>webview ok</h1><p>react-native-webview smoke test</p></body></html>';

export function WebViewSmokeTest({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>DEV: WebView Smoke Test</Text>
        <Text style={styles.close} onPress={() => navigation.goBack()}>✕ Close</Text>
      </View>
      <WebView
        style={styles.webview}
        source={{ html: SMOKE_HTML }}
        onLoadEnd={() => console.log('[WebViewSmokeTest] loaded')}
        onError={(e) => console.log('[WebViewSmokeTest] error', e.nativeEvent)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:   { fontSize: 14, fontWeight: '700', color: colors.text },
  close:   { fontSize: 14, color: colors.primary, fontWeight: '600' },
  webview: { flex: 1 },
});
