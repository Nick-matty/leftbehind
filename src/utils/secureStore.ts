// Encrypted-at-rest persistence for sensitive Zustand stores.
//
// Design:
//  - A 256-bit device master key is generated once and stored in the hardware-
//    backed keystore via expo-secure-store (iOS Keychain / Android Keystore),
//    scoped WHEN_UNLOCKED_THIS_DEVICE_ONLY (not synced to iCloud, not in backups).
//  - On web (no SecureStore), the same AES key is kept in AsyncStorage so
//    payloads are still ciphertext at rest (XSS can still steal the key).
//  - Store payloads are encrypted with AES-256-GCM before AsyncStorage writes.
//  - Legacy plaintext payloads migrate on the next write.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';
import { gcm } from '@noble/ciphers/aes';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';
import { utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils';

const MASTER_KEY_ID = 'leftbehind.master.key.v1';
const ENVELOPE_PREFIX = 'enc:v1:';

let cachedKey: Uint8Array | null = null;
let masterKeyPromise: Promise<Uint8Array | null> | null = null;
let secureStoreModule: typeof import('expo-secure-store') | null | undefined;

function getSecureStore(): typeof import('expo-secure-store') | null {
  if (secureStoreModule !== undefined) return secureStoreModule;
  if (Platform.OS === 'web') {
    secureStoreModule = null;
    return null;
  }
  try {
    // Lazy require so the bundle builds even before the native module is installed.
    secureStoreModule = require('expo-secure-store');
  } catch {
    secureStoreModule = null;
  }
  return secureStoreModule;
}

async function loadMasterKey(): Promise<Uint8Array | null> {
  const SecureStore = getSecureStore();

  if (SecureStore) {
    const options = {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    } as const;
    try {
      let hex = await SecureStore.getItemAsync(MASTER_KEY_ID, options);
      if (!hex) {
        hex = bytesToHex(randomBytes(32));
        await SecureStore.setItemAsync(MASTER_KEY_ID, hex, options);
      }
      cachedKey = hexToBytes(hex);
      return cachedKey;
    } catch {
      return null;
    }
  }

  // Web / no SecureStore: still encrypt payloads with a device key kept in
  // AsyncStorage (XSS can steal it, but casual storage dumps no longer show plaintext).
  try {
    let hex = await AsyncStorage.getItem(MASTER_KEY_ID);
    if (!hex) {
      hex = bytesToHex(randomBytes(32));
      await AsyncStorage.setItem(MASTER_KEY_ID, hex);
    }
    cachedKey = hexToBytes(hex);
    return cachedKey;
  } catch {
    return null;
  }
}

// Shared, de-duplicated so concurrent store hydration cannot generate/overwrite
// competing master keys (which would corrupt already-encrypted blobs).
function getMasterKey(): Promise<Uint8Array | null> {
  if (cachedKey) return Promise.resolve(cachedKey);
  if (!masterKeyPromise) {
    masterKeyPromise = loadMasterKey().then((key) => {
      if (!key) masterKeyPromise = null; // allow retry if it failed
      return key;
    });
  }
  return masterKeyPromise;
}

async function encryptValue(plaintext: string): Promise<string> {
  const key = await getMasterKey();
  if (!key) return plaintext; // absolute last resort
  const iv = randomBytes(12);
  const ciphertext = gcm(key, iv).encrypt(utf8ToBytes(plaintext));
  return `${ENVELOPE_PREFIX}${bytesToHex(iv)}:${bytesToHex(ciphertext)}`;
}

async function decryptValue(stored: string): Promise<string | null> {
  if (!stored.startsWith(ENVELOPE_PREFIX)) {
    // Legacy plaintext payload — return as-is; it re-encrypts on next write.
    return stored;
  }
  const key = await getMasterKey();
  if (!key) return null; // encrypted blob but no key available -> cannot read
  try {
    const parts = stored.split(':'); // ['enc','v1',ivHex,ctHex]
    const iv = hexToBytes(parts[2]);
    const ciphertext = hexToBytes(parts[3]);
    const plain = gcm(key, iv).decrypt(ciphertext);
    return bytesToUtf8(plain);
  } catch {
    // Tampered/corrupt payload or wrong key. Fail closed (treat as no data).
    return null;
  }
}

/**
 * Zustand-compatible StateStorage that encrypts values at rest on native
 * platforms and migrates legacy plaintext installs seamlessly.
 */
export function createSecureStorage(): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const raw = await AsyncStorage.getItem(name);
        if (raw == null) return null;
        return await decryptValue(raw);
      } catch {
        return null;
      }
    },
    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const enc = await encryptValue(value);
        await AsyncStorage.setItem(name, enc);
      } catch {
        // Swallow: never crash the app on a persistence failure.
      }
    },
    removeItem: async (name: string): Promise<void> => {
      try {
        await AsyncStorage.removeItem(name);
      } catch {
        /* noop */
      }
    },
  };
}

/** Wipe the device master key (e.g. on full account reset). Encrypted blobs become unreadable. */
export async function destroyMasterKey(): Promise<void> {
  cachedKey = null;
  masterKeyPromise = null;
  const SecureStore = getSecureStore();
  try {
    if (SecureStore) await SecureStore.deleteItemAsync(MASTER_KEY_ID);
    else await AsyncStorage.removeItem(MASTER_KEY_ID);
  } catch {
    /* noop */
  }
}
