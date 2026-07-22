// Central security configuration. Secrets are injected at build time via
// environment variables (see app.config.js) and surfaced through
// expo-constants `extra` — never hardcoded in source that ships in the binary.
import Constants from 'expo-constants';

type SecurityExtra = {
  devPasscode?: string | null;
  apiBaseUrl?: string | null;
  pinnedHost?: string | null;
  certPinsSha256?: string[];
};

const extra = (Constants.expoConfig?.extra ?? {}) as SecurityExtra;

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const SecurityConfig = {
  // ---- Password / PIN key derivation (PBKDF2-HMAC-SHA256) ----
  kdfIterations: 100_000,
  kdfKeyLenBytes: 32,
  saltBytes: 16,

  // ---- PIN brute-force protection ----
  maxPinAttempts: 5,
  // After maxPinAttempts, lock for lockoutBaseMs, doubling each further burst.
  lockoutBaseMs: 30_000,
  lockoutMaxMs: 15 * 60_000,

  // ---- Password policy ----
  minPasswordLength: 8,
  /** Require at least one letter and one digit. */
  requireLetterAndDigit: true,

  // ---- Developer console ----
  // Passcode is injected from env (LB_DEV_PASSCODE) at build time. In a
  // production build the dev console screen refuses to mount at all (see
  // app/dev/knowledge.tsx), so no usable secret ships in release binaries.
  devPasscode: asOptionalString(extra.devPasscode),

  // ---- Backend (none yet) ----
  // When apiBaseUrl is set, the API client enforces HTTPS. Certificate pinning
  // is enforced at the native layer (iOS NSPinnedDomains / Android
  // network_security_config), configured for `pinnedHost` with `certPinsSha256`.
  apiBaseUrl: asOptionalString(extra.apiBaseUrl),
  pinnedHost: asOptionalString(extra.pinnedHost),
  certPinsSha256: Array.isArray(extra.certPinsSha256)
    ? extra.certPinsSha256.filter((p): p is string => typeof p === 'string')
    : [],
} as const;

export type SecurityConfigType = typeof SecurityConfig;
