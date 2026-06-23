import axios from 'axios';
import { getPendingRows, markSynced, markFailed } from '../db/sync';
import { api } from '../api';
import type { LessonResultBody, LessonResultResponse } from '../api/endpoints';
import { serverAcceptedResult } from '../api/puzzleResult';

let isDraining = false;

export async function drain(): Promise<void> {
  if (isDraining) return;
  isDraining = true;

  try {
    const rows = await getPendingRows();

    for (const row of rows) {
      // Parse stored payload — malformed JSON is a permanent error, park it.
      let body: LessonResultBody;
      try {
        body = JSON.parse(row.payload_json) as LessonResultBody;
      } catch {
        await markFailed(row.idempotency_key);
        continue;
      }

      try {
        const response = await api.lesson.submitResult(body);
        const data = response.data as LessonResultResponse | null;

        // Success = a genuine 200 the server durably recorded — CORRECT OR WRONG.
        // award is null on a valid 200 (wrong answer / open-ended empty = "no award",
        // a locked product decision), so award must NOT gate sync. The 503-ceiling
        // interceptor resolves with null data + status 503, which fails both checks.
        if (response.status === 200 && serverAcceptedResult(data)) {
          await markSynced(row.idempotency_key);
          continue;
        }

        // Only the true 503-ceiling reaches here (status 503, null data).
        // Server is overloaded — back off the whole pass, retry on next trigger.
        break;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;

          if (status === 409) {
            // Server already has this key — treat as synced, keep draining.
            await markSynced(row.idempotency_key);
            continue;
          }

          if (status === 400 || status === 422) {
            // Permanently malformed — park, keep draining the rest.
            await markFailed(row.idempotency_key);
            continue;
          }

          if (status === 500) {
            // Row-specific server error — leave pending, but DON'T head-of-line-block
            // the rest of the queue. Try the other rows; this one retries next pass.
            continue;
          }

          // 401: interceptor already triggered logout — stop the pass.
          // No status (network error / timeout): connectivity is gone — stop the pass.
        }
        break;
      }
    }
  } finally {
    isDraining = false;
  }

  // Wallet reconciliation: GET /wallet → Redux, after the pass regardless of how many
  // rows synced. Matches ProfileScreen:38 (proven shape). Failure is silent — next drain retries.
  try {
    const { data } = await api.wallet.get();
    const { store } = require('../store') as typeof import('../store');
    const { setWallet } = require('../store/slices/walletSlice') as typeof import('../store/slices/walletSlice');
    store.dispatch(setWallet({ balance: data.balance, currency: 'INR' }));
  } catch {
    // Network still unavailable — wallet reconciles on next drain.
  }
}
