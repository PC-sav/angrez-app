import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  SafeAreaView, ScrollView, Share, Alert,
} from 'react-native';
import Constants from 'expo-constants';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setWallet } from '../../store/slices/walletSlice';
import { logout } from '../../store/slices/userSlice';
import { api } from '../../api';
import { clearToken } from '../../api/client';
import { persistor } from '../../store';
import { getSubstageProgressCount } from '../../db/content';
import { MAIN } from '../../copy/main';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export function ProfileScreen() {
  const dispatch   = useAppDispatch();
  const userName   = useAppSelector((s) => s.user.name);
  const refCode    = useAppSelector((s) => s.user.referral_code);
  const walletBal  = useAppSelector((s) => s.wallet.balance);

  const [subStagesDone, setSubStagesDone] = useState(0);

  // Load sub-stages count from DB on mount
  useEffect(() => {
    getSubstageProgressCount()
      .then(setSubStagesDone)
      .catch(() => { /* DB unavailable — keep 0 */ });
  }, []);

  // Refresh wallet from server on mount; show cached Redux value first
  useEffect(() => {
    api.wallet.get()
      .then(({ data }) => {
        dispatch(setWallet({ balance: data.balance, currency: 'INR' }));
      })
      .catch(() => { /* network failure — keep cached value */ });
  }, [dispatch]);

  async function handleWhatsAppShare() {
    if (!refCode) return;
    try {
      await Share.share({ message: MAIN.profile.whatsappMessage(refCode) });
    } catch {
      // User cancelled or share unavailable — ignore
    }
  }

  async function handleDevReset() {
    Alert.alert('Dev Reset', 'Clear JWT + Redux state and restart auth flow?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await Promise.all([persistor.purge(), clearToken()]);
          dispatch(logout());
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>{MAIN.profile.greeting(userName)}</Text>

        {/* Wallet card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{MAIN.profile.walletTitle}</Text>
          <Text style={styles.walletBalance}>
            {MAIN.profile.walletBalance(walletBal)}
          </Text>
        </View>

        {/* Referral card */}
        {refCode ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{MAIN.profile.referralTitle}</Text>
            <Text style={styles.referralCode}>
              {MAIN.profile.referralCode(refCode)}
            </Text>
            <Pressable style={styles.whatsappButton} onPress={handleWhatsAppShare}>
              <Text style={styles.whatsappButtonText}>
                {MAIN.profile.whatsappShare}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Progress stat */}
        <View style={styles.card}>
          <Text style={styles.statText}>
            {MAIN.profile.subStagesCompleted(subStagesDone)}
          </Text>
        </View>

        {/* Dev Reset (dev builds only) */}
        {__DEV__ && (
          <Pressable style={styles.devButton} onPress={handleDevReset}>
            <Text style={styles.devButtonText}>⚙ DEV: Reset Auth</Text>
          </Pressable>
        )}

        {/* App version */}
        <Text style={styles.version}>{MAIN.profile.version(APP_VERSION)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F5F0EB' },
  scroll:  { padding: 24, paddingBottom: 60, gap: 16 },

  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },

  walletBalance: { fontSize: 36, fontWeight: '800', color: '#1A1A2E' },

  referralCode: { fontSize: 16, fontWeight: '600', color: '#1A1A2E', letterSpacing: 1 },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  whatsappButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  statText: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },

  devButton: {
    borderWidth: 1,
    borderColor: '#C0392B',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'center',
  },
  devButtonText: { color: '#C0392B', fontSize: 13, fontWeight: '600' },

  version: { textAlign: 'center', fontSize: 12, color: '#BBB', marginTop: 8 },
});
