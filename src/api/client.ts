// Hardened API client scaffold.
//
// The app is currently offline-first with NO backend, so this is inert until
// `LB_API_BASE_URL` is configured (see app.config.js / SecurityConfig). It is
// provided so that the day a backend is added, secure defaults are already in
// place:
//   - HTTPS is mandatory (refuses cleartext).
//   - Bearer token injected from a pluggable provider (store tokens in the
//     keychain via secureStore, never in plain AsyncStorage).
//   - Optional per-request HMAC signing (timestamp + nonce + body) to detect
//     tampering and replay.
//   - Request timeouts via AbortController.
//   - Errors are normalized so raw server internals never surface to the UI.
//
// Certificate pinning is enforced at the NATIVE layer (iOS NSPinnedDomains,
// Android network_security_config) — see app.config.js and
// plugins/withAndroidNetworkSecurity.js. Pinning cannot be done reliably in JS.
import { SecurityConfig } from '../config/security';
import { hmacSha256Hex, randomHex } from '../utils/crypto';
import { log } from '../utils/secureLog';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type TokenProvider = () => Promise<string | null> | string | null;
type SigningKeyProvider = () => Promise<string | null> | string | null;

let tokenProvider: TokenProvider = () => null;
let signingKeyProvider: SigningKeyProvider = () => null;

/** Inject how to obtain the current auth token (e.g. from secure storage). */
export function setTokenProvider(fn: TokenProvider) {
  tokenProvider = fn;
}

/** Inject the device/session HMAC signing key (hex). Optional. */
export function setSigningKeyProvider(fn: SigningKeyProvider) {
  signingKeyProvider = fn;
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Sign the request with HMAC-SHA256 if a signing key is available. */
  sign?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function apiFetch<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const base = typeof SecurityConfig.apiBaseUrl === 'string' ? SecurityConfig.apiBaseUrl : null;
  if (!base) throw new ApiError(0, 'No backend configured', 'no_backend');

  const url = base.replace(/\/+$/, '') + (path.startsWith('/') ? path : `/${path}`);
  // HTTPS is mandatory in production; http is permitted only for local dev.
  if (!url.toLowerCase().startsWith('https://') && !__DEV__) {
    throw new ApiError(0, 'Refusing non-HTTPS request', 'insecure_transport');
  }

  const method = opts.method ?? 'GET';
  const bodyStr = opts.body != null ? JSON.stringify(opts.body) : undefined;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(bodyStr ? { 'Content-Type': 'application/json' } : {}),
    ...opts.headers,
  };

  const token = await tokenProvider();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (opts.sign) {
    const key = await signingKeyProvider();
    if (key) {
      const ts = Date.now().toString();
      const nonce = randomHex(12);
      // Canonical string the backend must recompute to validate integrity/replay.
      const canonical = `${method}\n${path}\n${ts}\n${nonce}\n${bodyStr ?? ''}`;
      headers['X-Timestamp'] = ts;
      headers['X-Nonce'] = nonce;
      headers['X-Signature'] = hmacSha256Hex(key, canonical);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  const signal = opts.signal ?? controller.signal;

  try {
    const res = await fetch(url, { method, headers, body: bodyStr, signal });
    const text = await res.text();
    const data = text ? safeParse(text) : null;

    if (!res.ok) {
      // Never surface raw server error bodies to the UI/logs.
      log.warn('api: request failed', { status: res.status, path });
      throw new ApiError(res.status, mapStatusMessage(res.status), (data as any)?.code);
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error)?.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out', 'timeout');
    }
    throw new ApiError(0, 'Network error', 'network');
  } finally {
    clearTimeout(timeout);
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mapStatusMessage(status: number): string {
  if (status === 401 || status === 403) return 'Your session has expired. Please sign in again.';
  if (status === 429) return 'Too many requests. Please slow down and try again.';
  if (status >= 500) return 'The service is temporarily unavailable. Please try again later.';
  return 'Something went wrong. Please try again.';
}
