import axios from 'axios';
import { getPendingRows, markSynced, markFailed } from '../db/sync';
import { api } from '../api';
import type { LessonResultBody, LessonResultResponse } from '../api/endpoints';

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
        // The F2 interceptor can resolve the 503-ceiling as { data: null, status: 503 }.
        // Success requires status 200 AND a real award body — nothing weaker.
        const data = response.data as LessonResultResponse | null;

        if (response.status === 200 && data?.award != null) {
          await markSynced(row.idempotency_key);
        } else {
          // 503-ceiling or unexpected resolved state — leave pending, stop this pass.
          break;
        }
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;

          if (status === 409) {
            // Server already has this key — treat as synced.
            await markSynced(row.idempotency_key);
            continue;
          }

          if (status === 400 || status === 422) {
            // Permanently malformed — park, continue to next row.
            await markFailed(row.idempotency_key);
            continue;
          }

          // 401: interceptor already triggered logout — stop, no markFailed.
          // 500, network error, timeout: transient — leave pending, stop this pass.
        }
        break;
      }
    }
  } finally {
    isDraining = false;
  }

  // Wallet reconciliation: GET /wallet → Redux, runs after the pass regardless of
  // how many rows were synced.  Failure here is silent — next drain will retry.
  try {
    const { data } = await api.wallet.get();
    // Lazy-require avoids a circular import at module load time (mirrors client.ts).
    const { store } = require('../store') as typeof import('../store');
    const { setWallet } = require('../store/slices/walletSlice') as typeof import('../store/slices/walletSlice');
    store.dispatch(setWallet({ balance: data.balance, currency: 'INR' }));
  } catch {
    // Network still unavailable — wallet will reconcile on next drain.
  }
}
