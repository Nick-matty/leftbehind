// Drives cloud sync based on auth state + connectivity.
//  - Signed in + cloud configured  -> pull remote, then push local changes.
//  - Reconnect / app foreground      -> pull again to catch other devices.
//  - Signed out                      -> stop syncing.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../store/authStore';
import { loadSession } from '../features/cloud/keys';
import { startSync, stopSync, pullAll, isSyncing } from '../features/cloud/syncManager';
import { isCloudEnabled } from '../features/cloud/api';

export function useCloudSync(): void {
  const currentUserId = useAuthStore((s) => s.currentUserId);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!currentUserId || !isCloudEnabled()) {
        stopSync();
        return;
      }
      const session = await loadSession();
      if (!active || !session) return;
      await startSync({ pullFirst: true });
    })();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  // Re-pull when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isSyncing()) void pullAll();
    });
    return () => sub.remove();
  }, []);

  // Re-pull when connectivity is regained.
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected && isSyncing()) void pullAll();
    });
    return () => unsub();
  }, []);
}
