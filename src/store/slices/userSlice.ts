import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Shape of the user object returned by the server (all nullable fields explicit)
export interface ServerUser {
  id: string;
  phone: string;
  name: string | null;
  language: string;
  level: number;
  goal: string | null;
  google_id: string | null;
  created_at: string;
  email: string | null;
  referral_code: string;
}

interface UserState {
  id: string | null;
  phone: string | null;
  name: string | null;
  language: string | null;
  level: number;
  goal: string | null;
  daily_time: number | null;
  referral_code: string | null;
  email: string | null;
  google_id: string | null;
  created_at: string | null;
  isLoggedIn: boolean;
}

const initialState: UserState = {
  id: null,
  phone: null,
  name: null,
  language: null,
  level: 1,
  goal: null,
  daily_time: null,
  referral_code: null,
  email: null,
  google_id: null,
  created_at: null,
  isLoggedIn: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Merge rule: server non-null value wins; if server sends null, keep the local value.
    // This lets locally-collected onboarding answers survive a /auth/me response that
    // still has null fields (before PATCH /auth/me ships).
    mergeUser(state, action: PayloadAction<Partial<ServerUser>>) {
      const s = action.payload;
      if (s.id != null)           state.id           = s.id;
      if (s.phone != null)        state.phone        = s.phone;
      if (s.name != null)         state.name         = s.name;
      if (s.language != null)     state.language     = s.language;
      if (s.level != null)        state.level        = s.level;
      if (s.goal != null)         state.goal         = s.goal;
      if (s.referral_code != null) state.referral_code = s.referral_code;
      if (s.email != null)        state.email        = s.email;
      if (s.google_id != null)    state.google_id    = s.google_id;
      if (s.created_at != null)   state.created_at   = s.created_at;
      // isLoggedIn is NOT set here — call setLoggedIn() explicitly when auth is complete
    },

    setLoggedIn(state) {
      state.isLoggedIn = true;
    },

    setLanguage(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },

    // Persists the three onboarding answers locally (no backend write endpoint yet — Decision A)
    setOnboarding(
      state,
      action: PayloadAction<{ name: string | null; goal: string; daily_time: number }>,
    ) {
      if (action.payload.name != null) state.name = action.payload.name;
      state.goal        = action.payload.goal;
      state.daily_time  = action.payload.daily_time;
    },

    logout() {
      return { ...initialState };
    },
  },
});

export const { mergeUser, setLoggedIn, setLanguage, setOnboarding, logout } = userSlice.actions;
export default userSlice.reducer;
