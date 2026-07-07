/**
 * Google Play Billing — thin wrapper around react-native-iap@15.3.6.
 *
 * D1c Block 2. Client grants nothing (invariant #1, angrez backend D1c brief):
 * this module only fetches product prices and dispatches purchase requests.
 * Entitlement truth arrives via RTDN → backend → the existing /api/subscription
 * poll, exactly as D1b. purchasePlan()'s job ends the moment the store accepts
 * the request; the outcome is delivered later via wirePurchaseListeners().
 *
 * Product/plan map mirrors the backend exactly — angrez/src/services/playBilling.ts
 * PRODUCT_ID_TO_PLAN. Keep the two in sync; a mismatch here silently fails closed
 * (unknown productId → no offer found → purchasePlan throws before ever reaching
 * the store), it does not silently charge the wrong plan.
 */

import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ErrorCode,
  type Purchase,
  type PurchaseError,
  type ProductSubscription,
  type ProductSubscriptionAndroidOfferDetails,
} from 'react-native-iap';

export type PlanKey = 'month' | 'year';
export type OfferChoice = 'trial' | 'base';

// Must match angrez/src/services/playBilling.ts PRODUCT_ID_TO_PLAN exactly —
// these are Play Console product IDs (Block 0, P0.12), not our internal plan names.
const PLAN_TO_PRODUCT_ID: Record<PlanKey, string> = {
  month: 'angrez_month',
  year: 'angrez_year',
};

const ALL_PRODUCT_IDS = Object.values(PLAN_TO_PRODUCT_ID);

export interface PlanOffer {
  offerToken: string;
  formattedPrice: string;
  /** Raw micro-units (1e6 = 1 currency unit) — exposed for the PaywallScreen
   *  early-bird strike-through sanity guard (only show "was ₹X" when Play's
   *  actual price is genuinely lower than the server's base_amount). */
  priceAmountMicros: string;
}

export interface PlanProduct {
  planKey: PlanKey;
  productId: string;
  title: string;
  /** Always-available ongoing recurring price. Null only if the product itself wasn't found. */
  baseOffer: PlanOffer | null;
  /** ₹9 / 7-day single-payment offer — null once the user has redeemed it (no longer eligible). */
  introOffer: PlanOffer | null;
}

// Maps a /api/plans PlanItem.plan value to the Play product + offer to purchase.
// 'trial' has no Play product of its own — it's the intro offer ON the month product.
export function resolvePurchaseTarget(
  itemPlan: 'trial' | 'month' | 'year',
): { planKey: PlanKey; offerChoice: OfferChoice } {
  if (itemPlan === 'trial') return { planKey: 'month', offerChoice: 'trial' };
  return { planKey: itemPlan, offerChoice: 'base' };
}

let connected = false;
let productsCache: Map<PlanKey, PlanProduct> = new Map();

export async function initBilling(): Promise<void> {
  if (connected) return;
  await initConnection();
  connected = true;
}

export async function endBilling(): Promise<void> {
  if (!connected) return;
  await endConnection();
  connected = false;
  productsCache = new Map();
}

// DISCOVERY-LITE FLAG (re-verify once Block 0 ships real products): this reads
// the deprecated `subscriptionOfferDetailsAndroid` field, not the newer
// cross-platform `subscriptionOffers`. Reason: `subscriptionOffers[].type`
// ('introductory' | 'promotional' | 'one-time') has no documented value for a
// plain no-discount base plan, and whether the array is empty (vs. containing a
// base-only entry) when a base plan has zero active offers could not be
// confirmed from static source — openiap.dev's docs page didn't render textual
// content via fetch, and no real product exists yet to test live against.
// `subscriptionOfferDetailsAndroid` is a direct, unprocessed mirror of Google's
// own BillingClient.SubscriptionOfferDetails, whose shape is stable and
// well-documented: exactly one entry per (basePlanId, offerId), with the plain
// base plan always present as a single-phase entry. Confirm against a real
// product at the S-gate / Block 3 device test and switch to `subscriptionOffers`
// if its semantics turn out to be safe.
function selectOffers(offers: ProductSubscriptionAndroidOfferDetails[]): {
  base: PlanOffer | null;
  intro: PlanOffer | null;
} {
  let base: PlanOffer | null = null;
  let intro: PlanOffer | null = null;

  for (const offer of offers) {
    const phases = offer.pricingPhases.pricingPhaseList;
    if (phases.length <= 1) {
      // Single phase — the plain ongoing recurring price, no discount.
      if (!base) {
        base = {
          offerToken: offer.offerToken,
          formattedPrice: phases[0]?.formattedPrice ?? '',
          priceAmountMicros: phases[0]?.priceAmountMicros ?? '0',
        };
      }
    } else if (!intro) {
      // Multiple phases — phase[0] is the discounted/intro phase (our ₹9, 7-day offer).
      intro = {
        offerToken: offer.offerToken,
        formattedPrice: phases[0].formattedPrice,
        priceAmountMicros: phases[0].priceAmountMicros,
      };
    }
  }

  return { base, intro };
}

export async function getPlanProducts(): Promise<Map<PlanKey, PlanProduct>> {
  const results = await fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'subs' });
  const products = (results ?? []) as Array<
    ProductSubscription & { subscriptionOfferDetailsAndroid?: ProductSubscriptionAndroidOfferDetails[] }
  >;

  const map = new Map<PlanKey, PlanProduct>();

  for (const [planKey, productId] of Object.entries(PLAN_TO_PRODUCT_ID) as Array<[PlanKey, string]>) {
    const product = products.find((p) => p.id === productId);
    if (!product) continue; // not found — pre-Block-0, or a Play Console/map mismatch

    const { base, intro } = selectOffers(product.subscriptionOfferDetailsAndroid ?? []);
    map.set(planKey, { planKey, productId, title: product.title, baseOffer: base, introOffer: intro });
  }

  productsCache = map;
  return map;
}

// Fire-and-forget once the store accepts the request (invariant #1 — no grant
// here). Throws only on synchronous dispatch failure (not connected, no cached
// offer, store validation error) — callers should route that the same as any
// purchaseError listener outcome (the warm failed state, W3).
export async function purchasePlan(planKey: PlanKey, offerChoice: OfferChoice, userUuid: string): Promise<void> {
  const product = productsCache.get(planKey);
  if (!product) throw new Error(`purchasePlan: no cached product for "${planKey}" — call getPlanProducts() first`);

  const offer = offerChoice === 'trial' ? product.introOffer : product.baseOffer;
  if (!offer) throw new Error(`purchasePlan: no "${offerChoice}" offer available for "${planKey}"`);

  await requestPurchase({
    request: {
      google: {
        skus: [product.productId],
        subscriptionOffers: [{ sku: product.productId, offerToken: offer.offerToken }],
        // Load-bearing (invariant #2): without this, Block 1's fail-closed user
        // gate rejects the RTDN webhook and the user never gets granted.
        obfuscatedAccountId: userUuid,
      },
    },
    type: 'subs',
  });
}

export function isUserCancelled(error: PurchaseError): boolean {
  return error.code === ErrorCode.UserCancelled;
}

// Wires the purchase-outcome listeners once per mount. Gated on purchase.purchaseState
// (PurchaseState = 'pending' | 'purchased' | 'unknown' — confirmed from the v15 type
// defs, node_modules/react-native-iap/lib/typescript/src/types.d.ts):
//
//   'purchased' → finishTransaction({isConsumable:false}) → onSuccess. Confirmed via
//     node_modules/react-native-iap/android/.../HybridRnIap.kt that this calls
//     acknowledgePurchaseAndroid under the hood — required within 3 days or Google
//     auto-refunds. Acknowledgement is NOT entitlement: it only stops the refund
//     clock, it grants nothing locally.
//   'pending' → NOT finished/acknowledged. Google only allows acknowledging a
//     PURCHASED transaction — a pending purchase (e.g. a deferred payment method
//     awaiting bank/UPI confirmation) hasn't actually been captured yet;
//     acknowledging now would be premature and is not what Google's own billing
//     flow expects. The listener fires again once the state resolves to
//     'purchased' (or the purchase is cancelled) — finishTransaction happens then.
//     Still routed to onSuccess: the /api/subscription poll correctly drains to
//     the 'processing' screen for a still-pending purchase, which is the right
//     UX while waiting, without granting or acknowledging anything early.
//   anything else ('unknown') → logged, no callback — an unrecognised state isn't
//     safe to treat as either a success or a failure.
export function wirePurchaseListeners(handlers: {
  onSuccess: (purchase: Purchase) => void;
  onError: (error: PurchaseError) => void;
}): () => void {
  const updatedSub = purchaseUpdatedListener(async (purchase) => {
    if (purchase.purchaseState === 'purchased') {
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch (err) {
        console.warn('[billing] finishTransaction (acknowledge) failed', err);
      }
      handlers.onSuccess(purchase);
      return;
    }

    if (purchase.purchaseState === 'pending') {
      handlers.onSuccess(purchase);
      return;
    }

    console.warn('[billing] purchaseUpdatedListener: unexpected purchaseState', purchase.purchaseState);
  });

  const errorSub = purchaseErrorListener((error) => {
    handlers.onError(error);
  });

  return () => {
    updatedSub.remove();
    errorSub.remove();
  };
}
