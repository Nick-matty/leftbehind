// Client-side zero-knowledge crypto.
//
// masterKey = PBKDF2(password, randomKdfSalt, 100k)
// authKey   = PBKDF2(masterKey, "auth")     -> sent to the server (scrypt-hashed there)
// encKey    = PBKDF2(masterKey, "enc:v1")   -> NEVER leaves the device
//
// kdfSalt is public (stored on the server + locally) but random per account so
// precomputed tables cannot target all users of a given email.
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, hexToBytes, utf8ToBytes, randomBytes } from '@noble/hashes/utils';
import { gcm } from '@noble/ciphers/aes';
import { bytesToUtf8 } from '@noble/ciphers/utils';

const KDF_ITERATIONS = 100_000;
const LEGACY_PREFIX = 'legacy:email:';

export interface DerivedKeys {
  authKey: string;
  encKeyHex: string;
}

/** Cryptographically-secure random KDF salt (hex). */
export function generateKdfSalt(): string {
  return bytesToHex(randomBytes(16));
}

/** True when the salt is the old email-derived format (pre-random-salt accounts). */
export function isLegacyKdfSalt(salt: string): boolean {
  return !salt || salt.startsWith(LEGACY_PREFIX) || salt.length < 16;
}

export function legacyKdfSaltForEmail(email: string): string {
  return `${LEGACY_PREFIX}${email.trim().toLowerCase()}`;
}

/**
 * Derive auth + encryption keys. Prefer a random hex salt from generateKdfSalt().
 * Legacy accounts used a deterministic email salt — still supported for login.
 */
export function deriveKeys(password: string, kdfSalt: string): DerivedKeys {
  let saltBytes: Uint8Array;
  if (kdfSalt.startsWith(LEGACY_PREFIX)) {
    saltBytes = utf8ToBytes(`leftbehind:kdf:v1:${kdfSalt.slice(LEGACY_PREFIX.length)}`);
  } else {
    saltBytes = hexToBytes(kdfSalt);
  }

  const masterKey = pbkdf2(sha256, utf8ToBytes(password), saltBytes, {
    c: KDF_ITERATIONS,
    dkLen: 32,
  });

  const authInfo = kdfSalt.startsWith(LEGACY_PREFIX)
    ? utf8ToBytes(`auth:${password}`)
    : utf8ToBytes('auth');
  const authKey = bytesToHex(pbkdf2(sha256, masterKey, authInfo, { c: 1, dkLen: 32 }));
  const encKey = pbkdf2(sha256, masterKey, utf8ToBytes('enc:leftbehind:v1'), { c: 1, dkLen: 32 });

  return { authKey, encKeyHex: bytesToHex(encKey) };
}

export interface EncryptedBlob {
  ciphertext: string;
  iv: string;
}

export function encryptJSON(encKeyHex: string, plaintext: string): EncryptedBlob {
  const key = hexToBytes(encKeyHex);
  const iv = randomBytes(12);
  const ct = gcm(key, iv).encrypt(utf8ToBytes(plaintext));
  return { ciphertext: bytesToHex(ct), iv: bytesToHex(iv) };
}

export function decryptJSON(encKeyHex: string, ciphertext: string, iv: string): string {
  const key = hexToBytes(encKeyHex);
  const plain = gcm(key, hexToBytes(iv)).decrypt(hexToBytes(ciphertext));
  return bytesToUtf8(plain);
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const hasB1 = i + 1 < bytes.length;
    const hasB2 = i + 2 < bytes.length;
    const b1 = hasB1 ? bytes[i + 1]! : 0;
    const b2 = hasB2 ? bytes[i + 2]! : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += hasB1 ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += hasB2 ? B64[b2 & 63] : '=';
  }
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const byteLen = Math.floor((clean.length * 3) / 4) - pad;
  const bytes = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]!);
    const c1 = B64.indexOf(clean[i + 1] ?? 'A');
    const c2 = B64.indexOf(clean[i + 2] ?? 'A');
    const c3 = B64.indexOf(clean[i + 3] ?? 'A');
    const n = (c0 << 18) | (c1 << 12) | ((c2 & 63) << 6) | (c3 & 63);
    if (p < byteLen) bytes[p++] = (n >> 16) & 255;
    if (p < byteLen) bytes[p++] = (n >> 8) & 255;
    if (p < byteLen) bytes[p++] = n & 255;
  }
  return bytes;
}

export interface EncryptedBinary {
  ciphertext: string;
  iv: string;
}

export function encryptBytes(encKeyHex: string, data: Uint8Array): EncryptedBinary {
  const key = hexToBytes(encKeyHex);
  const iv = randomBytes(12);
  const ct = gcm(key, iv).encrypt(data);
  return { ciphertext: bytesToBase64(ct), iv: bytesToBase64(iv) };
}

export function decryptToBytes(encKeyHex: string, ciphertext: string, iv: string): Uint8Array {
  const key = hexToBytes(encKeyHex);
  return gcm(key, base64ToBytes(iv)).decrypt(base64ToBytes(ciphertext));
}
