import client, { BASE_URL } from './client';

// ── resolveAsset ─────────────────────────────────────────────────────────────

export function resolveAsset(relativePath: string): string {
  if (!relativePath || /^https?:\/\//.test(relativePath)) return relativePath;
  const sep = relativePath.startsWith('/') ? '' : '/';
  return `${BASE_URL}${sep}${relativePath}`;
}

// ── Contract v1 types ────────────────────────────────────────────────────────

export interface OtpRequestPayload {
  phone: string;
}

export interface OtpVerifyPayload {
  phone: string;
  otp: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; name: string; phone: string };
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
}

export interface UserProgress {
  completedLessons: string[];
  currentLevel: number;
  totalXp: number;
}

export interface Puzzle {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  assetPath?: string;
}

export interface PuzzleResultPayload {
  puzzleId: string;
  userAnswer: string;
  isCorrect: boolean;
  idempotencyKey: string;
}

export interface WalletInfo {
  balance: number;
  currency: string;
}

type Opts = { signal?: AbortSignal };

// ── Typed API functions (Contract v1) ────────────────────────────────────────

export interface HealthResponse {
  status: string;
}

export const api = {
  health: {
    get: (opts?: Opts) =>
      client.get<HealthResponse>('/api/health', { signal: opts?.signal }),
  },

  auth: {
    requestOtp: (payload: OtpRequestPayload, opts?: Opts) =>
      client.post<void>('/auth/otp/request', payload, { signal: opts?.signal }),

    verifyOtp: (payload: OtpVerifyPayload, opts?: Opts) =>
      client.post<AuthResponse>('/auth/otp/verify', payload, { signal: opts?.signal }),
  },

  user: {
    getMe: (opts?: Opts) =>
      client.get<UserProfile>('/me', { signal: opts?.signal }),
  },

  progress: {
    get: (opts?: Opts) =>
      client.get<UserProgress>('/progress', { signal: opts?.signal }),
  },

  puzzles: {
    list: (opts?: Opts) =>
      client.get<Puzzle[]>('/puzzles', { signal: opts?.signal }),

    submitResult: (puzzleId: string, payload: PuzzleResultPayload, opts?: Opts) =>
      client.post<void>(`/puzzles/${puzzleId}/results`, payload, { signal: opts?.signal }),
  },

  wallet: {
    get: (opts?: Opts) =>
      client.get<WalletInfo>('/wallet', { signal: opts?.signal }),
  },
};
