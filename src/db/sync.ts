import { openDB } from './schema';

export interface SyncQueueRow {
  id: number;
  idempotency_key: string;
  puzzle_id: string;
  sub_stage_id: string;
  transcript: string | null;
  input_type: 'voice' | 'text' | 'tap';
  payload_json: string;
  status: 'pending' | 'synced' | 'failed';
  created_at: string;
  synced_at: string | null;
}

export type NewSyncRow = Omit<SyncQueueRow, 'id' | 'status' | 'created_at' | 'synced_at'>;

export async function insertSyncRow(row: NewSyncRow): Promise<void> {
  try {
    const db = await openDB();
    await db.runAsync(
      `INSERT OR IGNORE INTO sync_queue
         (idempotency_key, puzzle_id, sub_stage_id, transcript, input_type,
          payload_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [
        row.idempotency_key, row.puzzle_id, row.sub_stage_id,
        row.transcript ?? null, row.input_type, row.payload_json,
      ],
    );
  } catch (e) {
    console.warn('[DB] insertSyncRow failed:', e);
  }
}

export async function markSynced(idempotencyKey: string): Promise<void> {
  try {
    const db = await openDB();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'synced', synced_at = datetime('now')
       WHERE idempotency_key = ?`,
      [idempotencyKey],
    );
  } catch (e) {
    console.warn('[DB] markSynced failed:', e);
  }
}

export async function getPendingRows(): Promise<SyncQueueRow[]> {
  try {
    const db = await openDB();
    return await db.getAllAsync<SyncQueueRow>(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at`,
    );
  } catch (e) {
    console.warn('[DB] getPendingRows failed:', e);
    return [];
  }
}
