import { create } from 'zustand';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
  error: string | null;
}

// Lightweight, non-persisted status surface for the UI (profile "Sync now").
export const useSyncStatus = create<SyncStatus>()(() => ({
  state: 'idle',
  lastSyncedAt: null,
  error: null,
}));

export function setSyncState(state: SyncState, error: string | null = null): void {
  useSyncStatus.setState((s) => ({
    state,
    error,
    lastSyncedAt: state === 'synced' ? Date.now() : s.lastSyncedAt,
  }));
}
