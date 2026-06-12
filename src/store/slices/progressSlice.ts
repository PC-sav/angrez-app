import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ProgressState {
  completedLessons: string[];
  currentLevel: number;
  totalXp: number;
}

const initialState: ProgressState = {
  completedLessons: [],
  currentLevel: 1,
  totalXp: 0,
};

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    markLessonComplete(state, action: PayloadAction<string>) {
      if (!state.completedLessons.includes(action.payload)) {
        state.completedLessons.push(action.payload);
      }
    },
    addXp(state, action: PayloadAction<number>) {
      state.totalXp += action.payload;
    },
    setLevel(state, action: PayloadAction<number>) {
      state.currentLevel = action.payload;
    },
    setProgress(
      state,
      action: PayloadAction<{ completedLessons: string[]; currentLevel: number; totalXp: number }>,
    ) {
      state.completedLessons = action.payload.completedLessons;
      state.currentLevel = action.payload.currentLevel;
      state.totalXp = action.payload.totalXp;
    },
  },
});

export const { markLessonComplete, addXp, setLevel, setProgress } = progressSlice.actions;
export default progressSlice.reducer;
