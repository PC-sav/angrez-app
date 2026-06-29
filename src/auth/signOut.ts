import { persistor, store } from '../store';
import { logout } from '../store/slices/userSlice';
import { clearToken } from './token';
import { openDB } from '../db/schema';

export async function signOut(): Promise<void> {
  await Promise.all([
    persistor.purge(),
    clearToken(),
    clearUserScopedData().catch((e) => console.warn('[signOut] sqlite clear failed', e)),
  ]);
  store.dispatch(logout());
}

// best-effort; a SQLite failure must NEVER block auth teardown
async function clearUserScopedData(): Promise<void> {
  const db = await openDB();
  await db.execAsync('DELETE FROM sync_queue;');
  await db.execAsync('DELETE FROM current_plan;');
  await db.execAsync('DELETE FROM substage_progress;');
}
