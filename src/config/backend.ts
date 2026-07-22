// Local development backend URL resolution.
//
// Mobile devices cannot reach your PC via `localhost` — that points at the
// phone itself. In __DEV__ we derive the API host from Expo's Metro host
// (same LAN IP the app already uses), so registration hits the SQLite DB
// when `npm run dev` is running in /server.
//
// Override manually if needed, e.g. 'http://192.168.1.42:4000'.
// Set to '' to force offline-only auth (no cloud).
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Manual override. Leave empty to auto-detect in __DEV__. */
export const DEV_API_BASE_URL_OVERRIDE = '';

const DEV_PORT = 4000;

function hostFromExpo(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    // @ts-expect-error older manifests
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    // @ts-expect-error SDK 49-
    Constants.manifest?.debuggerHost,
    Constants.linkingUri,
  ];
  for (const raw of candidates) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    // Examples: "192.168.1.12:8081", "exp://192.168.1.12:8081", "http://localhost:8081"
    const cleaned = raw.replace(/^[a-z]+:\/\//i, '');
    const host = cleaned.split('/')[0]?.split(':')[0]?.trim();
    if (host) return host;
  }
  return null;
}

/**
 * Resolve the API base URL used while developing.
 * Returns '' when cloud should stay disabled.
 */
export function resolveDevApiBaseUrl(): string {
  const override = DEV_API_BASE_URL_OVERRIDE.trim();
  if (override) return override.replace(/\/+$/, '');

  // Production builds must use LB_API_BASE_URL via SecurityConfig — not this.
  if (typeof __DEV__ !== 'undefined' && !__DEV__) return '';

  const host = hostFromExpo();

  if (Platform.OS === 'android') {
    // Emulator loopback to the host machine.
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2') {
      return `http://10.0.2.2:${DEV_PORT}`;
    }
    return `http://${host}:${DEV_PORT}`;
  }

  if (Platform.OS === 'web') {
    return `http://localhost:${DEV_PORT}`;
  }

  // iOS simulator can use localhost; physical device needs LAN host from Expo.
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${DEV_PORT}`;
  }

  return `http://localhost:${DEV_PORT}`;
}

/** Resolved at module load for the API client. */
export const DEV_API_BASE_URL = resolveDevApiBaseUrl();
