import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MainStackParamList } from '../../navigation/types';
import { api } from '../../api';
import type { PlanItem } from '../../api/endpoints';
import { MAIN } from '../../copy/main';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<MainStackParamList, 'Paywall'>;

// Days from now until isoString date (ceil, min 0).
function daysUntil(isoString: string): number {
  return Math.max(0, Math.ceil((new Date(isoString).getTime() - Date.now()) / 86_400_000));
}

// Converts UTC midnight ISO string → IST time string e.g. "5:30 सुबह"
function formatISTReset(isoString: string): string {
  const utcMs = new Date(isoString).getTime();
  const istMs = utcMs + 5.5 * 60 * 60 * 1000;
  const d = new Date(istMs);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h < 12 ? 'सुबह' : 'शाम';
  const h12 = h % 12 || 12;
  const mm = m.toString().padStart(2, '0');
  return `${h12}:${mm} ${ampm}`;
}

function PlanCard({ item, featured }: { item: PlanItem; featured: boolean }) {
  const effectivePrice = item.campaign_price ?? item.base_amount;
  const name = MAIN.paywall.planNames[item.plan] ?? item.plan;
  const duration = MAIN.paywall.planDuration[item.plan] ?? '';

  function handleUpgrade() {
    Alert.alert('जल्द आ रहा है', MAIN.paywall.stubNotice);
  }

  return (
    <View style={[styles.planCard, featured && styles.planCardFeatured]}>
      {featured && (
        <View style={styles.bestValueBadge}>
          <Text style={styles.bestValueText}>{MAIN.paywall.bestValue}</Text>
        </View>
      )}
      {item.campaign_name && (
        <View style={styles.campaignBadge}>
          <Text style={styles.campaignText}>{MAIN.paywall.campaign(item.campaign_name)}</Text>
        </View>
      )}
      {item.quota_remaining !== null && (
        <Text style={styles.urgencyLine}>{MAIN.paywall.quotaRemaining(item.quota_remaining)}</Text>
      )}
      {item.ends_at !== null && (
        <Text style={styles.urgencyLine}>{MAIN.paywall.daysRemaining(daysUntil(item.ends_at))}</Text>
      )}
      <View style={styles.planRow}>
        <Text style={[styles.planName, featured && styles.planNameFeatured]}>{name}</Text>
        <View style={styles.priceBlock}>
          {item.campaign_price !== null && (
            <Text style={styles.strikePrice}>₹{item.base_amount}</Text>
          )}
          <Text style={[styles.price, featured && styles.priceFeatured]}>
            ₹{effectivePrice}
          </Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
      </View>
      <Pressable
        style={[styles.ctaButton, featured && styles.ctaButtonFeatured]}
        onPress={handleUpgrade}
      >
        <Text style={[styles.ctaText, featured && styles.ctaTextFeatured]}>
          {MAIN.paywall.ctaButton}
        </Text>
      </Pressable>
    </View>
  );
}

export function PaywallScreen({ route, navigation }: Props) {
  const params = route.params;
  const isLimit = params.source === 'limit';

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.plans.list()
      .then(({ data }) => setPlans(data.plans))
      .catch(() => { /* keep empty — cards simply won't render */ })
      .finally(() => setLoading(false));
  }, []);

  // Guard: formatISTReset is only called in limit mode where next_available_at is defined.
  const resetTime = isLimit ? formatISTReset(params.next_available_at) : null;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.closeLabel}>
              {isLimit ? MAIN.paywall.closeLabel : MAIN.paywall.upgradeCloseLabel}
            </Text>
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {isLimit ? MAIN.paywall.title : MAIN.paywall.upgradeHero}
          </Text>
          {isLimit && (
            <Text style={styles.heroSubtitle}>{MAIN.paywall.subtitle}</Text>
          )}
          {isLimit && resetTime !== null && (
            <View style={styles.resetPill}>
              <Text style={styles.resetText}>{MAIN.paywall.resetLabel(resetTime)}</Text>
            </View>
          )}
        </View>

        {/* Plan cards */}
        <Text style={styles.sectionTitle}>{MAIN.paywall.unlockTitle}</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          plans.map((item, i) => (
            <PlanCard key={item.plan} item={item} featured={i === 0} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 48, gap: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heroTitle:    { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  heroSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  resetPill: {
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 4,
  },
  resetText: { fontSize: 13, color: '#A0720A', fontWeight: '600' },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },

  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  planCardFeatured: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  bestValueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bestValueText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  campaignBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  campaignText: { fontSize: 11, fontWeight: '600', color: '#856404' },
  urgencyLine:  { fontSize: 12, fontWeight: '600', color: '#E07B00' },

  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName:         { fontSize: 18, fontWeight: '700', color: colors.text },
  planNameFeatured: { color: colors.primary },

  priceBlock:   { alignItems: 'flex-end', gap: 2 },
  strikePrice:  { fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through' },
  price:        { fontSize: 22, fontWeight: '800', color: colors.text },
  priceFeatured:{ color: colors.primary },
  duration:     { fontSize: 12, color: colors.textSecondary },

  ctaButton: {
    backgroundColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  ctaButtonFeatured: { backgroundColor: colors.primary },
  ctaText:           { fontSize: 15, fontWeight: '700', color: colors.text },
  ctaTextFeatured:   { color: colors.surface },
});
