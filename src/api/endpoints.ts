import client, { BASE_URL } from './client';
import type { ServerUser } from '../store/slices/userSlice';

// ── resolveAsset ─────────────────────────────────────────────────────────────

export function resolveAsset(relativePath: string): string {
  if (!relativePath || /^https?:\/\//.test(relativePath)) return relativePath;
  const sep = relativePath.startsWith('/') ? '' : '/';
  return `${BASE_URL}${sep}${relativePath}`;
}

// ── Contract v1 request / response types ────────────────────────────────────

export interface HealthResponse {
  status: string;
}

export interface OtpRequestPayload {
  phone: string;
}

export interface OtpRequestResponse {
  devOtp?: string; // present only when OTP_STUB_MODE=true on the server
}

export interface OtpVerifyPayload {
  phone: string;
  code: string;
  referral_code?: string;
}

export interface OtpVerifyResponse {
  token: string;
  user: ServerUser;
  isNewUser: boolean;
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

export interface WalletResponse {
  balance: number;
  transactions?: unknown[];
  limit?: number;
  offset?: number;
}

/** @deprecated Use WalletResponse for API calls; keep for slice typing compat. */
export interface WalletInfo {
  balance: number;
  currency: string;
}

export interface ContentPack {
  id: string;
  stage: number;
  version: number;
  language: string;
  name_en: string;
  name_l1: string;
  sub_stage_count: number;
  published_at: string;
}

export interface ContentPacksResponse {
  packs: ContentPack[];
}

export interface TeachItem {
  type: string;
  audio?: string;
  prompt_audio?: string;
  responses?: Array<{ audio?: string; [key: string]: unknown }>;
}

export interface PracticeItem {
  type: string;
  audio?: string;
  image?: string;
  ai_line_audio?: string;
}

// ── F5 Lesson types ──────────────────────────────────────────────────────────

export interface TeachPhraseItem {
  type: 'phrase';
  en?: string;
  l1?: string;
  audio?: string;
  l1_meaning?: string;
  l1_note?: string;
}

export interface TeachExchangeResponse {
  en?: string;
  l1?: string;
  audio?: string;
  register_l1?: string;
}

export interface TeachExchangeItem {
  type: 'exchange';
  prompt_en?: string;
  prompt_l1?: string;
  prompt_audio?: string;
  responses?: TeachExchangeResponse[];
}

export type TeachItemDetailed = TeachPhraseItem | TeachExchangeItem | (TeachItem & { type: string });

export interface ListenAndRespondPuzzle {
  type: 'listen_and_respond';
  id: string;
  audio?: string;
  prompt_en?: string;
  instruction_l1?: string;
  accept?: string[];
  open_ended?: boolean;
  fallback?: { options: string[] };
}

export interface SpeakThePicturePuzzle {
  type: 'speak_the_picture';
  id: string;
  image?: string;
  instruction_l1?: string;
  target?: string;
  fallback?: { options: string[] };
}

export interface RepetitionDrillPuzzle {
  type: 'repetition_drill';
  id: string;
  audio?: string;
  target?: string;
  instruction_l1?: string;
}

export interface RolePlayTurnPuzzle {
  type: 'role_play_turn';
  id: string;
  ai_line_audio?: string;
  scenario_l1?: string;
  post_feedback_l1?: string;
  instruction_l1?: string;
}

export interface UnknownPuzzle {
  type: string;
  id?: string;
  [key: string]: unknown;
}

export type AnyPracticeItem =
  | ListenAndRespondPuzzle
  | SpeakThePicturePuzzle
  | RepetitionDrillPuzzle
  | RolePlayTurnPuzzle
  | UnknownPuzzle;

export interface LessonPayload {
  sub_stage_id: string;
  pack_id: string;
  title_en: string;
  title_l1: string;
  micro_skill_l1: string;
  status: string;
  mastery_score: number;
  warmup?: { audio?: string };
  teach: TeachItemDetailed[];
  practice: AnyPracticeItem[];
  review: unknown[];
}

export interface LessonResultBody {
  puzzle_id: string;
  sub_stage_id: string;
  transcript: string | null;
  input_type: 'voice' | 'text' | 'tap';
  used_voice: boolean;
  idempotency_key: string;
}

export interface LessonResultResponse {
  correct: boolean;
  award: { base: number; voice_bonus: number };
  feedback_l1: string;
}

export interface SubstageCompleteBody {
  sub_stage_id: string;
}

export interface SubstageCompleteResponse {
  mastered: boolean;
  points_awarded: number;
  balance: number;
  next_sub_stage_id: string | null;
  message: string;
}

export interface NextPlanResponse {
  locked?: false;
  pack_id: string;
  sub_stage_id: string;
  title_en: string;
  title_l1: string;
  micro_skill_l1: string;
  status: string;
  mastery_score: number;
  teach: TeachItem[];
  practice: PracticeItem[];
  review: unknown[];
}

export interface LockedPlanResponse {
  locked: true;
  reason: 'daily_limit';
  limit: number;
  used: number;
  next_available_at: string;
}

// Union: api.plan.next() returns one of these two shapes.
// Discriminant: locked === true → LockedPlanResponse; absent/false → NextPlanResponse.
export type PlanNextResponse = NextPlanResponse | LockedPlanResponse;

export interface SubscriptionResponse {
  plan: 'free' | 'trial' | 'month' | 'year';
  status: 'none' | 'active' | 'expired';
  current_period_end: string | null;
}

export interface PlanItem {
  plan: 'year' | 'month' | 'trial';
  base_amount: number;
  campaign_price: number | null;
  currency: string;
  campaign_name: string | null;
  quota_remaining: number | null;
  ends_at: string | null;
}

export interface PlansResponse {
  plans: PlanItem[];
}

// Request has NO amount field — invariant #1: client never sends a price.
export interface PaymentOrderRequest {
  plan: string;
}

export interface PaymentOrderResponse {
  order_id: string;
  payment_session_id: string;
  amount: number;
}

export interface OrderStatusResponse {
  order_id: string;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'DROPPED';
}

type Opts = { signal?: AbortSignal };

// ── Typed API functions (Contract v1) ────────────────────────────────────────

export const api = {
  health: {
    get: (opts?: Opts) =>
      client.get<HealthResponse>('/api/health', { signal: opts?.signal }),
  },

  auth: {
    requestOtp: (payload: OtpRequestPayload, opts?: Opts) =>
      client.post<OtpRequestResponse>('/api/auth/otp/request', payload, { signal: opts?.signal }),

    verifyOtp: (payload: OtpVerifyPayload, opts?: Opts) =>
      client.post<OtpVerifyResponse>('/api/auth/otp/verify', payload, { signal: opts?.signal }),

    me: (opts?: Opts) =>
      client.get<ServerUser>('/api/auth/me', { signal: opts?.signal }),
  },

  progress: {
    get: (opts?: Opts) =>
      client.get<UserProgress>('/api/progress', { signal: opts?.signal }),
  },

  puzzles: {
    list: (opts?: Opts) =>
      client.get<Puzzle[]>('/api/puzzles', { signal: opts?.signal }),

    submitResult: (puzzleId: string, payload: PuzzleResultPayload, opts?: Opts) =>
      client.post<void>(`/api/puzzles/${puzzleId}/results`, payload, { signal: opts?.signal }),
  },

  wallet: {
    get: (opts?: Opts) =>
      client.get<WalletResponse>('/api/wallet', { signal: opts?.signal }),
  },

  content: {
    packs: (opts?: Opts) =>
      client.get<ContentPacksResponse>('/api/content/packs', { signal: opts?.signal }),
  },

  plan: {
    next: (opts?: Opts) =>
      client.get<PlanNextResponse>('/api/plan/next', { signal: opts?.signal }),
  },

  lesson: {
    submitResult: (body: LessonResultBody, opts?: Opts) =>
      client.post<LessonResultResponse>('/api/puzzles/result', body, { signal: opts?.signal }),

    completeSubstage: (body: SubstageCompleteBody, opts?: Opts) =>
      client.post<SubstageCompleteResponse>(
        '/api/substage/complete',
        body,
        { signal: opts?.signal },
      ),
  },

  subscription: {
    get: (opts?: Opts) =>
      client.get<SubscriptionResponse>('/api/subscription', { signal: opts?.signal }),
  },

  plans: {
    list: (opts?: Opts) =>
      client.get<PlansResponse>('/api/plans', { signal: opts?.signal }),
  },

  payments: {
    order: (body: PaymentOrderRequest, opts?: Opts) =>
      client.post<PaymentOrderResponse>('/api/payments/order', body, { signal: opts?.signal }),

    orderStatus: (orderId: string, opts?: Opts) =>
      client.get<OrderStatusResponse>(`/api/payments/order/${orderId}`, { signal: opts?.signal }),
  },
};
