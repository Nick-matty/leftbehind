// Document-vault PIN + biometrics.
//
// The PIN is protected with PBKDF2-HMAC-SHA256 + a secure random salt (never the
// raw PIN), the store is encrypted at rest (see secureStore.ts), and repeated
// wrong attempts trigger an exponential lockout to defeat offline brute force.
// Legacy SHA-256 PINs still verify and are upgraded on the next correct entry.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSecureStorage } from '../utils/secureStore';
import { hashSecret, verifySecret, needsUpgrade, secureSalt } from '../utils/crypto';
import { SecurityConfig } from '../config/security';
import { log } from '../utils/secureLog';

interface SecurityState {
  hasHydrated: boolean;
  /** PBKDF2 (or legacy SHA-256) hash of the PIN — never the raw PIN. */
  pinHash: string | null;
  pinSalt: string | null;
  biometricsEnabled: boolean;
  /** Session-only unlock (not persisted). */
  vaultUnlocked: boolean;
  /** Consecutive failed PIN attempts (persisted). */
  failedAttempts: number;
  /** Epoch ms until which PIN entry is locked out (persisted). */
  lockedUntil: number | null;

  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<{ ok: boolean; lockedForMs?: number }>;
  clearPin: () => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  unlockVault: () => void;
  lockVault: () => void;
  hasPin: () => boolean;
  lockRemainingMs: () => number;
}

function computeLockout(attempts: number): number {
  const over = attempts - SecurityConfig.maxPinAttempts;
  if (over < 0) return 0;
  const ms = SecurityConfig.lockoutBaseMs * Math.pow(2, over);
  return Math.min(ms, SecurityConfig.lockoutMaxMs);
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      pinHash: null,
      pinSalt: null,
      biometricsEnabled: false,
      vaultUnlocked: false,
      failedAttempts: 0,
      lockedUntil: null,

      setPin: async (pin) => {
        const cleaned = pin.replace(/\D/g, '');
        if (cleaned.length < 4 || cleaned.length > 8) {
          throw new Error('PIN must be 4–8 digits');
        }
        const salt = secureSalt();
        const pinHash = hashSecret(cleaned, salt);
        set({ pinSalt: salt, pinHash, vaultUnlocked: true, failedAttempts: 0, lockedUntil: null });
      },

      verifyPin: async (pin) => {
        const remaining = get().lockRemainingMs();
        if (remaining > 0) return { ok: false, lockedForMs: remaining };

        const { pinHash, pinSalt } = get();
        if (!pinHash || !pinSalt) return { ok: false };

        const cleaned = pin.replace(/\D/g, '');
        const ok = await verifySecret(cleaned, pinSalt, pinHash);

        if (!ok) {
          const failedAttempts = get().failedAttempts + 1;
          const lockMs = computeLockout(failedAttempts);
          set({
            failedAttempts,
            lockedUntil: lockMs > 0 ? Date.now() + lockMs : null,
          });
          return { ok: false, lockedForMs: lockMs > 0 ? lockMs : undefined };
        }

        // Success — reset throttle and upgrade legacy hash if needed.
        if (needsUpgrade(pinHash)) {
          try {
            const newSalt = secureSalt();
            const newHash = hashSecret(cleaned, newSalt);
            set({ pinSalt: newSalt, pinHash: newHash });
            log.debug('security: upgraded legacy PIN hash to PBKDF2');
          } catch (e) {
            log.warn('security: PIN hash upgrade failed', e);
          }
        }
        set({ vaultUnlocked: true, failedAttempts: 0, lockedUntil: null });
        return { ok: true };
      },

      clearPin: () =>
        set({ pinHash: null, pinSalt: null, vaultUnlocked: false, failedAttempts: 0, lockedUntil: null }),
      setBiometricsEnabled: (enabled) => set({ biometricsEnabled: enabled }),
      unlockVault: () => set({ vaultUnlocked: true }),
      lockVault: () => set({ vaultUnlocked: false }),
      hasPin: () => !!get().pinHash,
      lockRemainingMs: () => {
        const until = get().lockedUntil;
        if (!until) return 0;
        return Math.max(0, until - Date.now());
      },
    }),
    {
      name: 'leftbehind-security-v1',
      storage: createJSONStorage(() => createSecureStorage()),
      partialize: (s) => ({
        pinHash: s.pinHash,
        pinSalt: s.pinSalt,
        biometricsEnabled: s.biometricsEnabled,
        failedAttempts: s.failedAttempts,
        lockedUntil: s.lockedUntil,
      }),
      onRehydrateStorage: () => (_s, error) => {
        if (error) log.warn('LeftBehind: security store restore failed', error);
        useSecurityStore.setState({ hasHydrated: true, vaultUnlocked: false });
      },
    },
  ),
);
