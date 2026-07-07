/**
 * CHECKOUT_PROVIDER — D1c Block 2 (P0.4). Gates the Cashfree WebView checkout
 * route out of the Play Store build without deleting it — that code stays for
 * the angrez.in web funnel and a possible future user-choice-billing (UCB)
 * rollout.
 *
 * A plain literal, not env-derived: there is no "unset" state to fail out of.
 * Fail direction: any store/production build must resolve to 'play'. Only flip
 * to 'cashfree' deliberately, for a non-Play build target.
 */
export const CHECKOUT_PROVIDER: 'play' | 'cashfree' = 'play';
