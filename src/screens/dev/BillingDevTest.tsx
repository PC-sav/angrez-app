import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MainStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import { initBilling, getPlanProducts, endBilling } from '../../services/billing';

type Props = NativeStackScreenProps<MainStackParamList, 'BillingDevTest'>;

// DEV-only. S-gate (S2): confirms native iap/nitro wiring boots without a
// crash. A "product not found" result is a legitimate, HANDLED pass before
// Block 0 (Play Console products) ships — this screen exists precisely so
// that state is distinguishable from a native-module crash.
export function BillingDevTest({ navigation }: Props) {
  const [log, setLog] = useState<string>('(not run yet)');
  const [running, setRunning] = useState(false);

  async function runCheck() {
    setRunning(true);
    const lines: string[] = [];
    try {
      lines.push('initBilling() …');
      await initBilling();
      lines.push('  ok — connected');

      lines.push('getPlanProducts() …');
      const products = await getPlanProducts();
      if (products.size === 0) {
        lines.push('  0 products found (expected pre-Block-0 — handled, not a crash)');
      } else {
        for (const [planKey, product] of products) {
          lines.push(`  ${planKey}: ${product.productId} — "${product.title}"`);
          lines.push(`    base offer:  ${product.baseOffer ? product.baseOffer.formattedPrice : '(none)'}`);
          lines.push(`    intro offer: ${product.introOffer ? product.introOffer.formattedPrice : '(none — ineligible or not configured)'}`);
        }
      }
    } catch (err) {
      lines.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLog(lines.join('\n'));
      setRunning(false);
    }
  }

  async function runTeardown() {
    try {
      await endBilling();
      setLog((prev) => `${prev}\n\nendBilling() … ok`);
    } catch (err) {
      setLog((prev) => `${prev}\n\nendBilling() ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>DEV: Billing Test</Text>
        <Text style={styles.close} onPress={() => navigation.goBack()}>✕ Close</Text>
      </View>
      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={runCheck} disabled={running}>
          <Text style={styles.buttonText}>{running ? 'Running…' : 'Run initBilling + getPlanProducts'}</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={runTeardown} disabled={running}>
          <Text style={styles.buttonText}>endBilling</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.logBox}>
        <Text style={styles.logText}>{log}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:   { fontSize: 14, fontWeight: '700', color: colors.text },
  close:   { fontSize: 14, color: colors.primary, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, padding: 16 },
  button: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  logBox: { flex: 1, backgroundColor: colors.surface, margin: 16, borderRadius: 10, padding: 12 },
  logText: { fontSize: 12, fontFamily: 'monospace', color: colors.text },
});
