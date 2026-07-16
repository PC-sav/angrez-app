import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  SafeAreaView, ScrollView, Share, Alert, Modal, ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectIsFree } from '../../store/slices/subscriptionSlice';
import { setWallet, credit } from '../../store/slices/walletSlice';
import { api } from '../../api';
import type { FounderStatusResponse, ReferralStatusResponse } from '../../api';
import { signOut } from '../../auth/signOut';
import { getPendingRows } from '../../db/sync';
import { getSubstageProgressCount } from '../../db/content';
import { MAIN } from '../../copy/main';
import { colors } from '../../theme';
import { ShareCard, SHARE_CARD_SIZE } from '../../components/ShareCard';
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

  const [subStagesDone, setSubStagesDone]     = useState(0);
  const [founderStatus, setFounderStatus]     = useState<FounderStatusResponse | null>(null);
  const [claiming, setClaiming]               = useState(false);
  const [referralStatus, setReferralStatus]   = useState<ReferralStatusResponse | null>(null);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharing, setSharing]                     = useState(false);
  const [shareError, setShareError]               = useState<string | null>(null);
  const shareCardRef = useRef<View>(null);

  // Load sub-stages count from DB on mount
  useEffect(() => {
    getSubstageProgressCount()
      .then(setSubStagesDone)
      .catch(() => { /* DB unavailable — keep 0 */ });
  }, []);

  // Fetch founder status on mount; null while loading — card stays hidden until resolved.
  useEffect(() => {
    api.founder.status()
      .then(({ data }) => { if (data !== null) setFounderStatus(data); })
      .catch(() => { /* network failure — card stays hidden */ });
  }, []);

  // Fetch referral status on mount; null while loading — stats stay hidden until resolved.
  useEffect(() => {
    api.referral.status()
      .then(({ data }) => { if (data !== null) setReferralStatus(data); })
      .catch(() => { /* network failure — stats stay hidden */ });
  }, []);

  // Refresh wallet from server on mount; show cached Redux value first
  useEffect(() => {
    api.wallet.get()
      .then(({ data }) => {
        dispatch(setWallet({ balance: data.balance, currency: 'INR' }));
      })
      .catch(() => { /* network failure — keep cached value */ });
  }, [dispatch]);

  async function handleClaim() {
    if (claiming) return;
    setClaiming(true);
    try {
      const { data } = await api.founder.claim();
      if (data !== null && data.is_founder) {
        dispatch(credit(data.founder_bonus_points));
        setFounderStatus(data);
      }
    } catch {
      // Leave unclaimed — button re-enables so user can retry.
    } finally {
      setClaiming(false);
    }
  }

  async function handleWhatsAppShare() {
    if (!refCode) return;
    try {
      await Share.share({ message: MAIN.profile.whatsappMessage(refCode) });
    } catch {
      // User cancelled or share unavailable — ignore
    }
  }

  function openShareModal() {
    setShareError(null);
    setShareModalVisible(true);
  }

  function closeShareModal() {
    setShareModalVisible(false);
    setShareError(null);
  }

  async function handleShareCard() {
    if (sharing || !shareCardRef.current) return;
    setSharing(true);
    setShareError(null);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 0.9, width: 1080, height: 1080 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (e) {
      console.warn('[ShareCard] capture/share failed', e);
      setShareError(MAIN.shareCard.shareError);
    } finally {
      setSharing(false);
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

        {/* Founder card — hidden while loading (null) or when is_founder: false */}
        {founderStatus !== null && founderStatus.is_founder && (
          founderStatus.claimed ? (
            <View style={styles.founderCard}>
              <Text style={styles.founderCardTitle}>{MAIN.founder.cardTitle}</Text>
              <Text style={styles.founderHeadline}>{MAIN.founder.claimed.headline}</Text>
              <Text style={styles.founderSubtext}>
                {MAIN.founder.claimed.subtext(founderStatus.founder_bonus_points)}
              </Text>
            </View>
          ) : (
            <View style={styles.founderCard}>
              <Text style={styles.founderCardTitle}>{MAIN.founder.cardTitle}</Text>
              <Text style={styles.founderHeadline}>{MAIN.founder.unclaimed.headline}</Text>
              <Text style={styles.founderSubtext}>{MAIN.founder.unclaimed.subtext}</Text>
              <Pressable
                style={[styles.founderCta, claiming && styles.founderCtaDisabled]}
                onPress={handleClaim}
                disabled={claiming}
              >
                <Text style={styles.founderCtaText}>
                  {claiming ? '…' : MAIN.founder.unclaimed.cta(founderStatus.founder_bonus_points)}
                </Text>
              </Pressable>
            </View>
          )
        )}

        {/* Referral card */}
        {refCode ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{MAIN.profile.referralTitle}</Text>
            <Text style={styles.referralCode}>
              {MAIN.profile.referralCode(refCode)}
            </Text>
            {referralStatus !== null && (
              <View style={styles.referralStats}>
                <Text style={styles.referralStatLine}>
                  {MAIN.profile.referralInvited(referralStatus.total_referrals)}
                </Text>
                <Text style={styles.referralStatLine}>
                  {MAIN.profile.referralConverted(referralStatus.converted)}
                </Text>
                <Text style={styles.referralStatLine}>
                  {MAIN.profile.referralPoints(referralStatus.points_earned)}
                </Text>
                <Text style={styles.referralConditionText}>
                  {MAIN.profile.referralCondition}
                </Text>
              </View>
            )}
            <Pressable style={styles.whatsappButton} onPress={handleWhatsAppShare}>
              <Text style={styles.whatsappButtonText}>
                {MAIN.profile.whatsappShare}
              </Text>
            </Pressable>
            <Pressable style={styles.shareCardButton} onPress={openShareModal}>
              <Text style={styles.shareCardButtonText}>
                {MAIN.profile.shareCardButton}
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
        {__DEV__ && (
          <Pressable style={styles.devButton} onPress={() => navigation.navigate('BillingDevTest')}>
            <Text style={styles.devButtonText}>⚙ DEV: Billing test</Text>
          </Pressable>
        )}

        {/* App version */}
        <Text style={styles.version}>{MAIN.profile.version(APP_VERSION)}</Text>
      </ScrollView>

      {refCode && (
        <Modal
          visible={shareModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeShareModal}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <ShareCard
                ref={shareCardRef}
                name={userName}
                headline={MAIN.shareCard.headlineProgress(subStagesDone)}
                subStagesDone={subStagesDone}
                walletPoints={walletBal}
                referralCode={refCode}
              />

              {shareError && <Text style={styles.shareErrorText}>{shareError}</Text>}

              <Pressable
                style={[styles.shareModalCta, sharing && styles.shareModalCtaDisabled]}
                onPress={handleShareCard}
                disabled={sharing}
              >
                {sharing
                  ? <ActivityIndicator color={colors.surface} />
                  : <Text style={styles.shareModalCtaText}>{MAIN.shareCard.shareButton}</Text>
                }
              </Pressable>

              <Pressable onPress={closeShareModal}>
                <Text style={styles.modalCloseText}>{MAIN.shareCard.closeLabel}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
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
  referralStats: { gap: 4, marginTop: 2 },
  referralStatLine: { fontSize: 14, color: colors.textSecondary },
  referralConditionText: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  whatsappButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  shareCardButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  shareCardButtonText: { color: colors.primary, fontSize: 15, fontWeight: '700' },

  statText: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },

  founderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.warning, // gold-placeholder — repaints at theme migration
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  founderCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning, // gold-placeholder — repaints at theme migration
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  founderHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  founderSubtext: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  founderCta: {
    backgroundColor: colors.warning, // gold-placeholder — repaints at theme migration
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  founderCtaDisabled: { opacity: 0.55 },
  founderCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: SHARE_CARD_SIZE + 40,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  shareErrorText: {
    fontSize: 13,
    color: colors.warning,
    textAlign: 'center',
  },
  shareModalCta: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  shareModalCtaDisabled: { opacity: 0.55 },
  shareModalCtaText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
  modalCloseText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
