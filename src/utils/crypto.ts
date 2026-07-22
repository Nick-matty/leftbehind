// Cryptographic primitives for LeftBehind.
//
// Passwords and PINs are protected with PBKDF2-HMAC-SHA256 (key stretching) and
// cryptographically-secure random salts — NOT a bare SHA-256, which is far too
// fast and trivially brute-forced offline.
//
// Backward compatibility: older accounts were stored as a raw
// `SHA256(`${salt}:${secret}`)` hex string via expo-crypto. `verifySecret`
// still validates those legacy records so existing users can log in, and
// callers should transparently re-hash with `hashSecret` on the next
// successful auth (see authStore / securityStore).
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { bytesToHex, hexToBytes, utf8ToBytes, randomBytes } from '@noble/hashes/utils';
import * as ExpoCrypto from 'expo-crypto';
import { SecurityConfig } from '../config/security';

const PBKDF2_PREFIX = 'pbkdf2';

/** Cryptographically-secure random salt, hex-encoded. */
export function secureSalt(bytes: number = SecurityConfig.saltBytes): string {
  try {
    // expo-crypto uses the platform CSPRNG (SecRandomCopyBytes / SecureRandom).
    return bytesToHex(ExpoCrypto.getRandomBytes(bytes));
  } catch {
    // @noble/hashes randomBytes also uses a CSPRNG (crypto.getRandomValues).
    return bytesToHex(randomBytes(bytes));
  }
}

/** Random hex token (e.g. for request nonces). */
export function randomHex(bytes = 16): string {
  try {
    return bytesToHex(ExpoCrypto.getRandomBytes(bytes));
  } catch {
    return bytesToHex(randomBytes(bytes));
  }
}

/**
 * Derive a strong hash for a secret. Output encodes the algorithm + iteration
 * count so verification is self-describing and future-proof:
 *   pbkdf2$<iterations>$<hashHex>
 * The salt is stored separately by the caller.
 */
export function hashSecret(secret: string, saltHex: string): string {
  const iterations = SecurityConfig.kdfIterations;
  const key = pbkdf2(sha256, utf8ToBytes(secret), hexToBytes(saltHex), {
    c: iterations,
    dkLen: SecurityConfig.kdfKeyLenBytes,
  });
  return `${PBKDF2_PREFIX}$${iterations}$${bytesToHex(key)}`;
}

/** True if a stored hash uses the legacy (weak) SHA-256 format and should be upgraded. */
export function needsUpgrade(storedHash: string): boolean {
  return !storedHash.startsWith(`${PBKDF2_PREFIX}$`);
}

/**
 * Verify a secret against a stored hash. Handles both the modern PBKDF2 format
 * and the legacy expo-crypto SHA-256 format for backward compatibility.
 */
export async function verifySecret(
  secret: string,
  saltHex: string,
  storedHash: string,
): Promise<boolean> {
  if (storedHash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const parts = storedHash.split('$');
    const iterations = parseInt(parts[1], 10) || SecurityConfig.kdfIterations;
    const expected = parts[2] ?? '';
    const key = pbkdf2(sha256, utf8ToBytes(secret), hexToBytes(saltHex), {
      c: iterations,
      dkLen: SecurityConfig.kdfKeyLenBytes,
    });
    return timingSafeEqual(bytesToHex(key), expected);
  }

  // Legacy path: SHA-256 of `${salt}:${secret}` (the old on-device format).
  // `saltHex` here is whatever the legacy record stored as its salt.
  const legacy = await ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    `${saltHex}:${secret}`,
  );
  return timingSafeEqual(legacy.toLowerCase(), storedHash.toLowerCase());
}

/** Constant-time string comparison to avoid timing side channels. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** HMAC-SHA256, hex-encoded. Used for API request signing when a backend exists. */
export function hmacSha256Hex(keyHex: string, message: string): string {
  return bytesToHex(hmac(sha256, hexToBytes(keyHex), utf8ToBytes(message)));
}
