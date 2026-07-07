import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MainStackParamList } from '../../navigation/types';
import { api } from '../../api';
import type { PlanItem } from '../../api/endpoints';
import { useAppSelector } from '../../store/hooks';
import { MAIN } from '../../copy/main';
import { colors } from '../../theme';
import {
  initBilling, endBilling, getPlanProducts, purchasePlan,
  resolvePurchaseTarget, wirePurchaseListeners, isUserCancelled,
  type PlanKey, type PlanOffer, type PlanProduct,
} from '../../services/billing';

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

// A price we display must be a price Play will charge — never render a server
// price as purchasable (W4). 'loading': the first getPlanProducts() call hasn't
// settled yet — distinct from 'unavailable' so the paywall never flashes
// "price unavailable" before billing has even had a chance to answer.
// 'unavailable': settled, but products didn't load / fetch failed, retrying may
// help. 'ineligible': the product loaded fine but this specific offer (the
// trial's intro offer) isn't available for this user — de-emphasized, not a
// retry candidate (flagged choice: de-emphasize, not hide, so the paywall's
// card count/layout doesn't shift based on eligibility state).
type PriceState =
  | { kind: 'loading' }
  | { kind: 'ready'; offer: PlanOffer }
  | { kind: 'unavailable' }
  | { kind: 'ineligible' };

function resolvePriceState(
  item: PlanItem,
  products: Map<PlanKey, PlanProduct>,
  productsSettled: boolean,
): PriceState {
  if (!productsSettled) return { kind: 'loading' };
  const { planKey, offerChoice } = resolvePurchaseTarget(item.plan);
  const product = products.get(planKey);
  if (!product) return { kind: 'unavailable' };
  const offer = offerChoice === 'trial' ? product.introOffer : product.baseOffer;
  if (!offer) return offerChoice === 'trial' ? { kind: 'ineligible' } : { kind: 'unavailable' };
  return { kind: 'ready', offer };
}

// Early-bird strike-through sanity guard: only show "was ₹base_amount" when the
// server thinks a campaign discount is active AND Play's actual charge is
// genuinely lower than base_amount — Play doesn't know about our backend's
// campaigns, so a strike-through must never imply savings Play won't honour.
// priceAmountMicros is exposed by billing.ts for exactly this comparison; if it
// can't be parsed, fall back to gating on campaign_price !== null alone (a
// deliberately looser guard than the parsed-micros path, per instruction).
function shouldShowStrike(item: PlanItem, priceState: PriceState): boolean {
  if (item.campaign_price === null || priceState.kind !== 'ready') return false;
  const micros = Number(priceState.offer.priceAmountMicros);
  if (!Number.isFinite(micros) || micros <= 0) return true; // can't verify — gate on campaign_price alone
  return micros / 1_000_000 < item.base_amount;
}

function PlanCard({
  item, featured, priceState, onSelectPlan, onRetry, disabled, loading,
}: {
  item: PlanItem;
  featured: boolean;
  priceState: PriceState;
  onSelectPlan: () => void;
  onRetry: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  const name = MAIN.paywall.planNames[item.plan] ?? item.plan;
  const duration = MAIN.paywall.planDuration[item.plan] ?? '';
  const purchasable = priceState.kind === 'ready';

  return (
    <View style={[
      styles.planCard,
      featured && styles.planCardFeatured,
      !purchasable && styles.planCardDisabled,
    ]}>
      {featured && purchasable && (
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
          {priceState.kind === 'loading' ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : priceState.kind === 'ready' ? (
            <>
              {shouldShowStrike(item, priceState) && (
                <Text style={styles.strikePrice}>₹{item.base_amount}</Text>
              )}
              <Text style={[styles.price, featured && styles.priceFeatured]}>
                {priceState.offer.formattedPrice}
              </Text>
              <Text style={styles.duration}>{duration}</Text>
            </>
          ) : (
            <Text style={styles.priceUnavailableText}>
              {priceState.kind === 'ineligible' ? MAIN.paywall.introRedeemed : MAIN.paywall.priceUnavailable}
            </Text>
          )}
        </View>
      </View>
      {priceState.kind === 'unavailable' ? (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>{MAIN.paywall.retryLine}</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[
            styles.ctaButton,
            featured && styles.ctaButtonFeatured,
            (disabled || !purchasable) && styles.ctaButtonDisabled,
          ]}
          onPress={onSelectPlan}
          disabled={disabled || !purchasable}
        >
          {loading ? (
            <ActivityIndicator size="small" color={featured ? colors.surface : colors.text} />
          ) : (
            <Text style={[styles.ctaText, featured && styles.ctaTextFeatured]}>
              {MAIN.paywall.ctaButton}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export function PaywallScreen({ route, navigation }: Props) {
  const params = route.params;
  const isLimit = params.source === 'limit';
  const userId = useAppSelector((s) => s.user.id);

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [products, setProducts] = useState<Map<PlanKey, PlanProduct>>(new Map());
  const [productsSettled, setProductsSettled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);

  // productsSettled starts false and flips to true exactly once the first call
  // resolves or rejects — setting it again on a later retry is a harmless no-op,
  // so no separate "first call only" bookkeeping is needed. This is what
  // prevents the "कीमत लोड नहीं हुई" (price unavailable) copy from flashing
  // before billing has even had a chance to answer.
  function loadBillingProducts() {
    initBilling()
      .then(() => getPlanProducts())
      .then(setProducts)
      .catch((err) => console.warn('[Paywall] billing init/product fetch failed', err))
      .finally(() => setProductsSettled(true));
  }

  useEffect(() => {
    let cancelled = false;

    api.plans.list()
      .then(({ data }) => { if (!cancelled) setPlans(data.plans); })
      .catch(() => { /* keep empty — cards simply won't render */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    loadBillingProducts();

    return () => { cancelled = true; };
  // loadBillingProducts is stable (module-level functions only); empty deps is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unwire = wirePurchaseListeners({
      onSuccess: () => {
        setPurchasingPlan(null);
        navigation.navigate('PurchaseResult');
      },
      onError: (error) => {
        setPurchasingPlan(null);
        if (isUserCancelled(error)) return; // silent return to Paywall — no alert, no navigation
        Alert.alert(MAIN.checkout.result.failed.headline, MAIN.checkout.result.failed.subtext);
      },
    });
    return () => {
      unwire();
      endBilling();
    };
  // navigation is stable per react-navigation's guarantee; wiring once on mount is correct.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSelectPlan(item: PlanItem) {
    if (purchasingPlan || !userId) return;
    const { planKey, offerChoice } = resolvePurchaseTarget(item.plan);
    setPurchasingPlan(item.plan);
    try {
      await purchasePlan(planKey, offerChoice, userId);
      // Outcome arrives asynchronously via wirePurchaseListeners, not here (invariant #1).
    } catch {
      // Synchronous dispatch failure (not connected, no cached offer, store
      // validation error) — same warm-failed treatment as an async purchaseError.
      setPurchasingPlan(null);
      Alert.alert(MAIN.checkout.result.failed.headline, MAIN.checkout.result.failed.subtext);
    }
  }

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
            <PlanCard
              key={item.plan}
              item={item}
              featured={i === 0}
              priceState={resolvePriceState(item, products, productsSettled)}
              onSelectPlan={() => handleSelectPlan(item)}
              onRetry={loadBillingProducts}
              disabled={purchasingPlan !== null}
              loading={purchasingPlan === item.plan}
            />
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
  planCardDisabled: {
    opacity: 0.6,
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
  priceUnavailableText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },

  ctaButton: {
    backgroundColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  ctaButtonFeatured:  { backgroundColor: colors.primary },
  ctaButtonDisabled:  { opacity: 0.55 },
  ctaText:            { fontSize: 15, fontWeight: '700', color: colors.text },
  ctaTextFeatured:    { color: colors.surface },

  retryButton: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
