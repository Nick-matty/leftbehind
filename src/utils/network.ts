import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * True network status, used to gate the small number of features that need
 * a connection (live map search / directions / place photos). Everything
 * else in the app — packing lists, trips, budget, calendar — works fully
 * offline off local storage.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  return isOnline;
}
