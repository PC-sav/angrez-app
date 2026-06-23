// Single source of truth: "did the server durably record this attempt?" — the
// test that decides whether a sync_queue row may be marked synced.
//
// Real /api/puzzles/result 200 shape (from F5-green PuzzlePlayer:148-150):
//   { correct: boolean, award: { base, voice_bonus } | null, feedback_l1?: string }
// CRITICAL: award is NULL on a valid 200 — a wrong answer, or an open-ended empty
// response (contract: "no award" is a locked product decision). So award presence
// must NOT gate sync. The queue cares that the attempt REACHED the server, not that
// it earned points. The 503-ceiling interceptor resolves with null data (status 503),
// so a non-null body uniquely identifies a genuine 200.
export function serverAcceptedResult(data: unknown): boolean {
  return data != null;
}
