import crypto from 'node:crypto';

// The client sends a password-derived "auth key" (never the password). We hash
// it again server-side with scrypt so a database leak does not reveal the auth
// key. scrypt is memory-hard and built into Node — no native dependency.

const SCRYPT_N = 16384; // CPU/memory cost
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEY_LEN = 32;

export function hashAuthKey(authKey: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(authKey, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
  });
  return `${salt.toString('hex')}:${SCRYPT_N}:${SCRYPT_r}:${SCRYPT_p}:${derived.toString('hex')}`;
}

export function verifyAuthKey(authKey: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 5) return false;
  const [saltHex, nStr, rStr, pStr, hashHex] = parts as [string, string, string, string, string];
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = crypto.scryptSync(authKey, salt, expected.length, {
    N: parseInt(nStr, 10),
    r: parseInt(rStr, 10),
    p: parseInt(pStr, 10),
  });
  // Constant-time comparison.
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
