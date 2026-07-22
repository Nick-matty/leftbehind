// Secure logging: redacts sensitive fields and silences debug/info output in
// production so credentials, PINs, tokens, and salts never leak into device
// logs, crash reporters, or `adb logcat` / Console.app.
//
// Usage: import { log } from '../utils/secureLog';  log.debug('x', obj)

const IS_PROD = !__DEV__;

const SENSITIVE_KEY = /(pass(word|code)?|pin|token|secret|salt|hash|authorization|bearer|api[-_]?key|credential|cookie|session)/i;
const REDACTED = '[redacted]';

function scrub(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    // Redact anything that looks like a long opaque token (JWT / hex / base64).
    if (value.length > 40 && /^[A-Za-z0-9._\-+/=]+$/.test(value)) return REDACTED;
    return value;
  }
  if (typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? REDACTED : scrub(v, depth + 1);
  }
  return out;
}

function format(args: unknown[]): unknown[] {
  return args.map((a) => scrub(a));
}

export const log = {
  /** Verbose developer logging. Stripped entirely in production. */
  debug: (...args: unknown[]): void => {
    if (!IS_PROD) console.log(...format(args));
  },
  /** Informational logging. Stripped entirely in production. */
  info: (...args: unknown[]): void => {
    if (!IS_PROD) console.info(...format(args));
  },
  /** Warnings are kept in production but always scrubbed. */
  warn: (...args: unknown[]): void => {
    console.warn(...format(args));
  },
  /** Errors are kept in production but always scrubbed. */
  error: (...args: unknown[]): void => {
    console.error(...format(args));
  },
};
