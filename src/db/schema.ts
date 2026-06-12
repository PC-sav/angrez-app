import * as SQLite from 'expo-sqlite';

export type AppDB = SQLite.SQLiteDatabase;

export async function openDB(): Promise<AppDB> {
  const db = await SQLite.openDatabaseAsync('angrez.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
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
  } catch (e) {
    // SQLite unavailable in this build — local-first sync degrades gracefully
    console.warn('[DB] init failed:', e);
  }
}
