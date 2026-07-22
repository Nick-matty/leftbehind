// Secure session storage for the cloud account.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CloudSession {
  accessToken: string;
  refreshToken: string;
  email: string;
  encKeyHex: string;
  kdfSalt: string;
}

const STORAGE_KEY = 'leftbehind.session.v1';

let memorySession: CloudSession | null = null;
let secureStoreModule: typeof import('expo-secure-store') | null | undefined;

function getSecureStore(): typeof import('expo-secure-store') | null {
  if (secureStoreModule !== undefined) return secureStoreModule;
  if (Platform.OS === 'web') {
    secureStoreModule = null;
    return null;
  }
  try {
    secureStoreModule = require('expo-secure-store');
  } catch {
    secureStoreModule = null;
  }
  return secureStoreModule;
}

export async function saveSession(session: CloudSession): Promise<void> {
  memorySession = session;
  const SecureStore = getSecureStore();
  if (SecureStore) {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      /* keep in-memory */
    }
    return;
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export async function loadSession(): Promise<CloudSession | null> {
  if (memorySession) return memorySession;
  const SecureStore = getSecureStore();
  try {
    if (SecureStore) {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) memorySession = JSON.parse(raw) as CloudSession;
    } else {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) memorySession = JSON.parse(raw) as CloudSession;
    }
  } catch {
    /* ignore */
  }
  return memorySession;
}

export function getSessionSync(): CloudSession | null {
  return memorySession;
}

export async function updateTokens(accessToken: string, refreshToken: string): Promise<void> {
  const current = await loadSession();
  if (!current) return;
  await saveSession({ ...current, accessToken, refreshToken });
}

export async function updateEncKey(encKeyHex: string, kdfSalt: string): Promise<void> {
  const current = await loadSession();
  if (!current) return;
  await saveSession({ ...current, encKeyHex, kdfSalt });
}

export async function clearSession(): Promise<void> {
  memorySession = null;
  const SecureStore = getSecureStore();
  try {
    if (SecureStore) await SecureStore.deleteItemAsync(STORAGE_KEY);
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
