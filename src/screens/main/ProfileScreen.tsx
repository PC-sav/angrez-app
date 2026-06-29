import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  SafeAreaView, ScrollView, Share, Alert,
} from 'react-native';
import Constants from 'expo-constants';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectIsFree } from '../../store/slices/subscriptionSlice';
import { setWallet } from '../../store/slices/walletSlice';
import { api } from '../../api';
import { signOut } from '../../auth/signOut';
import { getPendingRows } from '../../db/sync';
import { getSubstageProgressCount } from '../../db/content';
import { MAIN } from '../../copy/main';
import { colors } from '../../theme';
import type { MainStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch   = useAppDispatch();
  const userName   = useAppSelector((s) => s.user.name);
  const refCode    = useAppSelector((s) => s.user.referral_code);
  const walletBal  = useAppSelector((s) => s.wallet.balance);
  const isFree     = useAppSelector(selectIsFree);

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

  async function handleLogout() {
    let pendingCount = 0;
    try {
      pendingCount = (await getPendingRows()).length;
    } catch (e) {
      console.warn('[handleLogout] pending check failed', e);
    }
    Alert.alert(
      'लॉग आउट',
      pendingCount > 0
        ? 'कुछ जवाब अभी सेव नहीं हुए — लॉग आउट करने पर वो चले जाएंगे। फिर भी लॉग आउट करें?'
        : 'क्या आप लॉग आउट करना चाहते हैं?',
      [
        { text: 'रद्द करें', style: 'cancel' },
        { text: 'लॉग आउट', style: 'destructive', onPress: async () => { await signOut(); } },
      ],
    );
  }

  async function handleDevReset() {
    Alert.alert('Dev Reset', 'Clear JWT + Redux state and restart auth flow?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => { await signOut(); },
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

        {/* Upgrade pill — only when subscription confirmed free */}
        {isFree && (
          <Pressable
            style={styles.upgradePill}
            onPress={() => navigation.navigate('Paywall', { source: 'upgrade' })}
          >
            <Text style={styles.upgradePillText}>{MAIN.paywall.upgradeButton}</Text>
          </Pressable>
        )}

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>लॉग आउट</Text>
        </Pressable>

        {/* Dev controls (dev builds only) */}
        {__DEV__ && (
          <Pressable style={styles.devButton} onPress={handleDevReset}>
            <Text style={styles.devButtonText}>⚙ DEV: Reset Auth</Text>
          </Pressable>
        )}
        {__DEV__ && (
          <Pressable style={styles.devButton} onPress={() => navigation.navigate('WebViewSmokeTest')}>
            <Text style={styles.devButtonText}>⚙ DEV: WebView test</Text>
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

  logoutButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },

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

  upgradePill: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradePillText: { color: colors.surface, fontSize: 16, fontWeight: '700' },

  version: { textAlign: 'center', fontSize: 12, color: '#BBB', marginTop: 8 },
});
