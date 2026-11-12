/**
 * TERRA Sync Service Stub (Future v2 Architecture)
 * 
 * In v1, TERRA is strictly local-first and on-device (IndexedDB).
 * This module outlines the sync interface for future optional cloud backends
 * (Supabase, Firebase, or custom REST API).
 */

export const syncState = {
  status: 'offline-local', // 'idle' | 'syncing' | 'error' | 'offline-local'
  lastSyncAt: null,
  pendingCount: 0,
};

/**
 * Push pending unsynced records to the remote database
 */
export async function pushPending() {
  console.info('[Sync Stub] Push pending called. Local-first mode active in v1.');
  return { success: true, pushed: 0 };
}

/**
 * Pull updates from the remote database
 */
export async function pullUpdates() {
  console.info('[Sync Stub] Pull updates called. Local-first mode active in v1.');
  return { success: true, pulled: 0 };
}

/**
 * Return current sync status
 */
export function status() {
  return { ...syncState };
}

