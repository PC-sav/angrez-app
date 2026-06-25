import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SubscriptionPlan = 'free' | 'trial' | 'month' | 'year';
export type SubscriptionStatus = 'none' | 'active' | 'expired';

interface SubscriptionState {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  isLoaded: boolean;
}

const initialState: SubscriptionState = {
  plan: 'free',
  status: 'none',
  current_period_end: null,
  isLoaded: false,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSubscription(state, action: PayloadAction<Omit<SubscriptionState, 'isLoaded'>>) {
      state.plan = action.payload.plan;
      state.status = action.payload.status;
      state.current_period_end = action.payload.current_period_end;
      state.isLoaded = true;
    },
  },
});

export const { setSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;

// Fails CLOSED: returns false until the server confirms plan === 'free'.
// A paid user never sees isLoaded=true with plan='free', so Upgrade gates never flash.
// On offline/error Bootstrap leaves isLoaded=false → selector returns false → gate hidden.
export const selectIsFree = (s: { subscription: SubscriptionState }) =>
  s.subscription.isLoaded && s.subscription.plan === 'free';
