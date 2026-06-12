import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Puzzle {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  assetPath?: string;
}

interface PuzzlesState {
  items: Puzzle[];
  currentPuzzleId: string | null;
  isLoading: boolean;
}

const initialState: PuzzlesState = {
  items: [],
  currentPuzzleId: null,
  isLoading: false,
};

const puzzlesSlice = createSlice({
  name: 'puzzles',
  initialState,
  reducers: {
    setPuzzles(state, action: PayloadAction<Puzzle[]>) {
      state.items = action.payload;
    },
    setCurrentPuzzle(state, action: PayloadAction<string | null>) {
      state.currentPuzzleId = action.payload;
    },
    setPuzzlesLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
  },
});

export const { setPuzzles, setCurrentPuzzle, setPuzzlesLoading } = puzzlesSlice.actions;
export default puzzlesSlice.reducer;
