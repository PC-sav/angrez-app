import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  isLoading: boolean;
  toastMessage: string | null;
  bootstrapped: boolean; // false until cold-start token check completes (never persisted)
}

const initialState: UiState = {
  isLoading: false,
  toastMessage: null,
  bootstrapped: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    showToast(state, action: PayloadAction<string>) {
      state.toastMessage = action.payload;
    },
    clearToast(state) {
      state.toastMessage = null;
    },
    setBootstrapped(state) {
      state.bootstrapped = true;
    },
  },
});

export const { setLoading, showToast, clearToast, setBootstrapped } = uiSlice.actions;
export default uiSlice.reducer;
