import * as SQLite from 'expo-sqlite';

export type AppDB = SQLite.SQLiteDatabase;

let _db: AppDB | null = null;
let _opening: Promise<AppDB> | null = null;

export function openDB(): Promise<AppDB> {
  if (_db) return Promise.resolve(_db);
  if (_opening) return _opening;

  _opening = SQLite.openDatabaseAsync('angrez.db')
    .then(async (db) => {
      try {
        await db.execAsync('PRAGMA foreign_keys = ON;');
      } catch (e) {
        console.warn('[DB] PRAGMA foreign_keys failed (one-time):', e);
      }
      _db = db;
      return db;
    })
    .catch((e) => {
      _opening = null; // allow retry next call
      throw e;
    });

  return _opening;
}

export async function initDatabase(): Promise<void> {
  try {
    const db = await openDB();

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS puzzles (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS puzzle_results (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        puzzle_id    TEXT    NOT NULL,
        user_answer  TEXT    NOT NULL,
        is_correct   INTEGER NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        synced       INTEGER DEFAULT 0,
        created_at   TEXT    DEFAULT (datetime('now')),
        FOREIGN KEY (puzzle_id) REFERENCES puzzles(id)
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS content_packs (
        stage          INTEGER PRIMARY KEY,
        id             TEXT    NOT NULL,
        version        INTEGER NOT NULL,
        language       TEXT    NOT NULL,
        name_en        TEXT    NOT NULL,
        name_l1        TEXT    NOT NULL,
        sub_stage_count INTEGER NOT NULL,
        published_at   TEXT,
        cached_at      TEXT    NOT NULL
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS current_plan (
        id             INTEGER PRIMARY KEY,
        pack_id        TEXT    NOT NULL,
        sub_stage_id   TEXT    NOT NULL,
        title_en       TEXT    NOT NULL,
        title_l1       TEXT    NOT NULL,
        micro_skill_l1 TEXT    NOT NULL,
        status         TEXT    NOT NULL,
        mastery_score  REAL    NOT NULL,
        payload_json   TEXT    NOT NULL,
        cached_at      TEXT    NOT NULL
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS substage_progress (
        sub_stage_id   TEXT    PRIMARY KEY,
        pack_id        TEXT    NOT NULL,
        title_en       TEXT    NOT NULL,
        title_l1       TEXT    NOT NULL,
        status         TEXT    NOT NULL,
        mastery_score  REAL    NOT NULL,
        recorded_at    TEXT    NOT NULL
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS asset_cache (
        remote_path    TEXT    PRIMARY KEY,
        local_uri      TEXT    NOT NULL,
        status         TEXT    NOT NULL,
        bytes          INTEGER,
        cached_at      TEXT    NOT NULL
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotency_key  TEXT    UNIQUE NOT NULL,
        puzzle_id        TEXT    NOT NULL,
        sub_stage_id     TEXT    NOT NULL,
        transcript       TEXT,
        input_type       TEXT    NOT NULL,
        payload_json     TEXT    NOT NULL,
        status           TEXT    NOT NULL DEFAULT 'pending',
        created_at       TEXT    NOT NULL,
        synced_at        TEXT
      );
    `);
  } catch (e) {
    // SQLite unavailable in this build — local-first sync degrades gracefully
    console.warn('[DB] init failed:', e);
  }
}
