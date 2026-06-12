import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
  balance: number;
  currency: string;
}

const initialState: WalletState = {
  balance: 0,
  currency: 'INR',
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWallet(state, action: PayloadAction<{ balance: number; currency: string }>) {
      state.balance = action.payload.balance;
      state.currency = action.payload.currency;
    },
    credit(state, action: PayloadAction<number>) {
      state.balance += action.payload;
    },
    debit(state, action: PayloadAction<number>) {
      state.balance = Math.max(0, state.balance - action.payload);
    },
  },
});

export const { setWallet, credit, debit } = walletSlice.actions;
export default walletSlice.reducer;
