// Cloud API client with automatic access-token refresh.
import { SecurityConfig } from '../../config/security';
import { resolveDevApiBaseUrl } from '../../config/backend';
import { loadSession, getSessionSync, updateTokens, clearSession } from './keys';

export class CloudError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'CloudError';
    this.status = status;
    this.code = code;
  }
}

export function getApiBaseUrl(): string | null {
  // Resolve DEV URL at call-time — Expo hostUri may not be ready at import.
  const candidates: unknown[] = [
    SecurityConfig.apiBaseUrl,
    typeof __DEV__ !== 'undefined' && __DEV__ ? resolveDevApiBaseUrl() : null,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    const base = trimmed.replace(/\/+$/, '');
    if (!__DEV__ && !base.toLowerCase().startsWith('https://')) continue;
    return base;
  }
  return null;
}

export function isCloudEnabled(): boolean {
  return getApiBaseUrl() !== null;
}

interface RawOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
}

function safeParse(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function rawFetch<T>(path: string, opts: RawOptions = {}): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new CloudError(0, 'Cloud is not configured', 'no_backend');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);

  try {
    const res = await fetch(base + path, {
      method: opts.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(opts.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    const data = safeParse(text) as { error?: string; code?: string } | null;

    if (!res.ok) {
      throw new CloudError(res.status, data?.error ?? 'Request failed', data?.code);
    }
    return data as T;
  } catch (e) {
    if (e instanceof CloudError) throw e;
    if ((e as Error)?.name === 'AbortError') throw new CloudError(0, 'Request timed out', 'timeout');
    throw new CloudError(0, 'Network error', 'network');
  } finally {
    clearTimeout(timer);
  }
}

async function tryRefresh(): Promise<boolean> {
  const session = getSessionSync() ?? (await loadSession());
  if (!session) return false;
  try {
    const data = await rawFetch<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    });
    await updateTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function authFetch<T>(path: string, opts: RawOptions = {}): Promise<T> {
  const session = await loadSession();
  if (!session) throw new CloudError(401, 'Not signed in', 'unauthorized');

  try {
    return await rawFetch<T>(path, { ...opts, token: session.accessToken });
  } catch (e) {
    if (e instanceof CloudError && e.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        const fresh = getSessionSync();
        return await rawFetch<T>(path, { ...opts, token: fresh?.accessToken });
      }
      await clearSession();
    }
    throw e;
  }
}

export interface RemoteUser {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}
interface AuthResponse {
  user: RemoteUser;
  accessToken: string;
  refreshToken: string;
  kdfSalt: string;
}
export interface RemoteBlob {
  storeKey: string;
  ciphertext: string;
  iv: string;
  rev: number;
  updatedAt: string;
}

export const cloud = {
  challenge: (email: string) =>
    rawFetch<{ kdfSalt: string; legacy?: boolean }>('/api/auth/challenge', {
      method: 'POST',
      body: { email },
    }),

  register: (email: string, fullName: string, authKey: string, kdfSalt: string) =>
    rawFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: { email, fullName, authKey, kdfSalt },
    }),

  login: (email: string, authKey: string) =>
    rawFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, authKey } }),

  logout: (refreshToken: string) =>
    rawFetch<void>('/api/auth/logout', { method: 'POST', body: { refreshToken } }),

  me: () => authFetch<{ user: RemoteUser }>('/api/auth/me'),

  updateProfile: (fullName: string) =>
    authFetch<{ user: RemoteUser }>('/api/auth/me', { method: 'PATCH', body: { fullName } }),

  changeCredentials: (currentAuthKey: string, newAuthKey: string, newKdfSalt: string) =>
    authFetch<void>('/api/auth/change-credentials', {
      method: 'POST',
      body: { currentAuthKey, newAuthKey, newKdfSalt },
    }),

  deleteAccount: () => authFetch<void>('/api/auth/me', { method: 'DELETE' }),

  pull: () => authFetch<{ blobs: RemoteBlob[] }>('/api/sync'),

  revisions: () =>
    authFetch<{ revisions: { storeKey: string; rev: number; updatedAt: string }[] }>('/api/sync/revisions'),

  push: (storeKey: string, ciphertext: string, iv: string, baseRev?: number) =>
    authFetch<{ blob: { storeKey: string; rev: number; updatedAt: string } }>(`/api/sync/${storeKey}`, {
      method: 'PUT',
      body: { ciphertext, iv, ...(typeof baseRev === 'number' ? { baseRev } : {}) },
    }),

  listFiles: () => authFetch<{ files: { fileId: string; rev: number; updatedAt: string }[] }>('/api/files'),

  getFile: (fileId: string) =>
    authFetch<{ file: { fileId: string; ciphertext: string; iv: string; rev: number; updatedAt: string } }>(
      `/api/files/${fileId}`,
      { timeoutMs: 60_000 },
    ),

  putFile: (fileId: string, ciphertext: string, iv: string) =>
    authFetch<{ file: { fileId: string; rev: number; updatedAt: string } }>(`/api/files/${fileId}`, {
      method: 'PUT',
      body: { ciphertext, iv },
      timeoutMs: 60_000,
    }),

  deleteFile: (fileId: string) => authFetch<void>(`/api/files/${fileId}`, { method: 'DELETE' }),
};
