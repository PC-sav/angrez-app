import { openDB } from './schema';

// ── Row types ────────────────────────────────────────────────────────────────

export interface ContentPackRow {
  stage: number;
  id: string;
  version: number;
  language: string;
  name_en: string;
  name_l1: string;
  sub_stage_count: number;
  published_at: string | null;
  cached_at: string;
}

export interface CurrentPlanRow {
  pack_id: string;
  sub_stage_id: string;
  title_en: string;
  title_l1: string;
  micro_skill_l1: string;
  status: string;
  mastery_score: number;
  payload_json: string;
  cached_at: string;
}

export interface SubstageProgressRow {
  sub_stage_id: string;
  pack_id: string;
  title_en: string;
  title_l1: string;
  status: string;
  mastery_score: number;
  recorded_at: string;
}

export interface AssetCacheRow {
  remote_path: string;
  local_uri: string;
  status: 'pending' | 'downloaded' | 'failed';
  bytes: number | null;
  cached_at: string;
}

// ── content_packs ────────────────────────────────────────────────────────────

export async function getContentPacks(): Promise<ContentPackRow[]> {
  try {
    const db = await openDB();
    return await db.getAllAsync<ContentPackRow>(
      'SELECT * FROM content_packs ORDER BY stage',
    );
  } catch (e) {
    console.warn('[DB] getContentPacks failed:', e);
    return [];
  }
}

/** Replace on higher version only. */
export async function upsertContentPack(
  pack: Omit<ContentPackRow, 'cached_at'>,
): Promise<void> {
  // Skip write if any required field is missing — prevents NullPointerException
  // in the native SQLite layer when the network response is partial.
  if (
    pack.stage == null || !pack.id || pack.version == null ||
    !pack.language || !pack.name_en || !pack.name_l1 || pack.sub_stage_count == null
  ) {
    console.warn('[DB] upsertContentPack: skipped — partial data', pack);
    return;
  }
  try {
    const db = await openDB();
    const existing = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM content_packs WHERE stage = ?',
      [pack.stage],
    );
    if (existing && existing.version >= pack.version) return;
    await db.runAsync(
      `INSERT OR REPLACE INTO content_packs
         (stage, id, version, language, name_en, name_l1, sub_stage_count, published_at, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        pack.stage, pack.id, pack.version, pack.language,
        pack.name_en, pack.name_l1, pack.sub_stage_count, pack.published_at ?? null,
      ],
    );
  } catch (e) {
    console.warn('[DB] upsertContentPack failed:', e);
  }
}

// ── current_plan (singleton id = 1) ─────────────────────────────────────────

export async function getCurrentPlan(): Promise<CurrentPlanRow | null> {
  try {
    const db = await openDB();
    return await db.getFirstAsync<CurrentPlanRow>(
      'SELECT * FROM current_plan WHERE id = 1',
    );
  } catch (e) {
    console.warn('[DB] getCurrentPlan failed:', e);
    return null;
  }
}

export async function upsertCurrentPlan(
  plan: Omit<CurrentPlanRow, 'cached_at'>,
): Promise<void> {
  // Skip write if any required field is missing — prevents NullPointerException
  // in the native SQLite layer when the network response is partial.
  if (
    !plan.pack_id || !plan.sub_stage_id || !plan.title_en ||
    !plan.title_l1 || !plan.micro_skill_l1 || !plan.status ||
    plan.mastery_score == null || !plan.payload_json
  ) {
    console.warn('[DB] upsertCurrentPlan: skipped — partial data', plan);
    return;
  }
  try {
    const db = await openDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO current_plan
         (id, pack_id, sub_stage_id, title_en, title_l1, micro_skill_l1,
          status, mastery_score, payload_json, cached_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        plan.pack_id, plan.sub_stage_id, plan.title_en, plan.title_l1,
        plan.micro_skill_l1, plan.status, plan.mastery_score, plan.payload_json,
      ],
    );
  } catch (e) {
    console.warn('[DB] upsertCurrentPlan failed:', e);
  }
}

// ── substage_progress ────────────────────────────────────────────────────────

export async function getSubstageProgress(): Promise<SubstageProgressRow[]> {
  try {
    const db = await openDB();
    return await db.getAllAsync<SubstageProgressRow>(
      'SELECT * FROM substage_progress ORDER BY recorded_at',
    );
  } catch (e) {
    console.warn('[DB] getSubstageProgress failed:', e);
    return [];
  }
}

export async function getSubstageProgressCount(): Promise<number> {
  try {
    const db = await openDB();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM substage_progress',
    );
    return row?.count ?? 0;
  } catch (e) {
    console.warn('[DB] getSubstageProgressCount failed:', e);
    return 0;
  }
}

export async function upsertSubstageProgress(
  row: Omit<SubstageProgressRow, 'recorded_at'>,
): Promise<void> {
  if (
    !row.sub_stage_id || !row.pack_id || !row.title_en ||
    !row.title_l1 || !row.status || row.mastery_score == null
  ) {
    console.warn('[DB] upsertSubstageProgress: skipped — partial data', row);
    return;
  }
  try {
    const db = await openDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO substage_progress
         (sub_stage_id, pack_id, title_en, title_l1, status, mastery_score, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        row.sub_stage_id, row.pack_id, row.title_en, row.title_l1,
        row.status, row.mastery_score,
      ],
    );
  } catch (e) {
    console.warn('[DB] upsertSubstageProgress failed:', e);
  }
}

// ── asset_cache ──────────────────────────────────────────────────────────────

export async function getAssetByPath(remotePath: string): Promise<AssetCacheRow | null> {
  try {
    const db = await openDB();
    return await db.getFirstAsync<AssetCacheRow>(
      'SELECT * FROM asset_cache WHERE remote_path = ?',
      [remotePath],
    );
  } catch (e) {
    console.warn('[DB] getAssetByPath failed:', e);
    return null;
  }
}

export async function upsertAssetCache(row: AssetCacheRow): Promise<void> {
  if (!row.remote_path) {
    console.warn('[DB] upsertAssetCache: skipped — missing remote_path');
    return;
  }
  try {
    const db = await openDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO asset_cache
         (remote_path, local_uri, status, bytes, cached_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [row.remote_path, row.local_uri, row.status, row.bytes ?? null],
    );
  } catch (e) {
    console.warn('[DB] upsertAssetCache failed:', e);
  }
}
