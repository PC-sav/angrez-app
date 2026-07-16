import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { MAIN } from '../copy/main';

// On-screen preview size (dp). Export capture forces exact 1080×1080 output
// regardless of this — see captureRef options in ProfileScreen.
export const SHARE_CARD_SIZE = 320;

interface ShareCardProps {
  name: string | null;
  headline: string;
  subStagesDone: number;
  walletPoints: number;
  referralCode: string;
}

export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { name, headline, subStagesDone, walletPoints, referralCode },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={styles.root}>
      <Text style={styles.wordmark}>{MAIN.shareCard.wordmark}</Text>
      <Text style={styles.tagline}>{MAIN.shareCard.tagline}</Text>

      {name ? <Text style={styles.name}>{name}</Text> : null}

      <Text style={styles.headline}>{headline}</Text>

      <View style={styles.stats}>
        <Text style={styles.statLine}>{MAIN.shareCard.subStagesStat(subStagesDone)}</Text>
        <Text style={styles.statLine}>{MAIN.shareCard.pointsStat(walletPoints)}</Text>
      </View>

      <View style={styles.referralBox}>
        <Text style={styles.referralText}>{MAIN.shareCard.referralLabel(referralCode)}</Text>
      </View>

      <Text style={styles.footer}>{MAIN.shareCard.footer}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    width: SHARE_CARD_SIZE,
    height: SHARE_CARD_SIZE,
    backgroundColor: colors.background,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  stats: {
    gap: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  statLine: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  referralBox: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  referralText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 12,
  },
});
