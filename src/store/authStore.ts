// Hybrid account system: offline-first local auth + optional zero-knowledge cloud.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { createSecureStorage } from '../utils/secureStore';
import { hashSecret, verifySecret, needsUpgrade, secureSalt } from '../utils/crypto';
import { SecurityConfig } from '../config/security';
import { log } from '../utils/secureLog';
import { deriveKeys, generateKdfSalt } from '../features/cloud/e2ee';
import { cloud, isCloudEnabled, CloudError } from '../features/cloud/api';
import { saveSession, clearSession, loadSession, updateEncKey } from '../features/cloud/keys';

function isOfflineError(e: unknown): boolean {
  return e instanceof CloudError && (e.code === 'network' || e.code === 'timeout' || e.code === 'no_backend');
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  salt: string;
  /** Cloud KDF salt (hex or legacy:email:...). Empty when local-only. */
  kdfSalt?: string;
  /** Local profile photo URI (device-only; not synced to cloud). */
  avatarUri?: string | null;
  createdAt: string;
}

interface AuthState {
  users: UserAccount[];
  currentUserId: string | null;
  hasHydrated: boolean;
  register: (fullName: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** Requires current password. Updates cloud credentials + re-encrypts when online. */
  resetPassword: (
    email: string,
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (fullName: string) => Promise<{ ok: boolean; error?: string }>;
  /** Persist a local avatar URI for the signed-in user (device-only). */
  setAvatarUri: (uri: string | null) => void;
  logout: () => void;
  currentUser: () => UserAccount | null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'fillAllFields';
  if (password.length < SecurityConfig.minPasswordLength) return 'passwordTooShort';
  if (SecurityConfig.requireLetterAndDigit) {
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'passwordWeak';
  }
  return null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: null,
      hasHydrated: false,

      register: async (fullName, email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const name = fullName.trim();
        if (!name || !normalizedEmail) return { ok: false, error: 'fillAllFields' };
        const pwError = validatePassword(password);
        if (pwError) return { ok: false, error: pwError };

        let salt: string;
        let passwordHash: string;
        try {
          salt = secureSalt();
          passwordHash = hashSecret(password, salt);
        } catch (e) {
          log.warn('auth: hash failed during register', e);
          return { ok: false, error: 'fillAllFields' };
        }

        // Prefer cloud when configured so the account lands in the server DB.
        if (isCloudEnabled()) {
          try {
            const kdfSalt = generateKdfSalt();
            const { authKey, encKeyHex } = deriveKeys(password, kdfSalt);
            const data = await cloud.register(normalizedEmail, name, authKey, kdfSalt);
            await saveSession({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              email: normalizedEmail,
              encKeyHex,
              kdfSalt: data.kdfSalt || kdfSalt,
            });
            const user: UserAccount = {
              id: data.user.id,
              fullName: name,
              email: normalizedEmail,
              passwordHash,
              salt,
              kdfSalt: data.kdfSalt || kdfSalt,
              createdAt: data.user.createdAt ?? new Date().toISOString(),
            };
            set((s) => ({
              users: [...s.users.filter((u) => u.email !== normalizedEmail), user],
              currentUserId: user.id,
            }));
            return { ok: true };
          } catch (e) {
            if (e instanceof CloudError && e.code === 'email_in_use') {
              return { ok: false, error: 'emailInUse' };
            }
            // Any other cloud failure (down, timeout, validation) → save locally
            // so registration never loops / dead-ends. User can still use the app.
            log.warn('auth: cloud register failed, saving locally', e);
          }
        }

        if (get().users.some((u) => u.email === normalizedEmail)) {
          return { ok: false, error: 'emailInUse' };
        }

        let id: string;
        try {
          id = Crypto.randomUUID();
        } catch {
          id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        const user: UserAccount = {
          id,
          fullName: name,
          email: normalizedEmail,
          passwordHash,
          salt,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ users: [...s.users, user], currentUserId: user.id }));
        return { ok: true };
      },

      login: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();

        if (isCloudEnabled()) {
          try {
            const { kdfSalt } = await cloud.challenge(normalizedEmail);
            const { authKey, encKeyHex } = deriveKeys(password, kdfSalt);
            const data = await cloud.login(normalizedEmail, authKey);
            const saltUsed = data.kdfSalt || kdfSalt;
            await saveSession({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              email: normalizedEmail,
              encKeyHex,
              kdfSalt: saltUsed,
            });
            const salt = secureSalt();
            const passwordHash = hashSecret(password, salt);
            const existing = get().users.find((u) => u.email === normalizedEmail);
            const user: UserAccount = {
              id: data.user.id,
              fullName: data.user.fullName ?? existing?.fullName ?? '',
              email: normalizedEmail,
              passwordHash,
              salt,
              kdfSalt: saltUsed,
              createdAt: data.user.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
            };
            set((s) => ({
              users: [...s.users.filter((u) => u.email !== normalizedEmail), user],
              currentUserId: user.id,
            }));
            return { ok: true };
          } catch (e) {
            // Wrong password on the server must NOT fall through to local auth.
            if (e instanceof CloudError && e.code === 'invalid_credentials') {
              // Exception: if this device already has a local-only account for the
              // email (registered while the server was down), allow local login.
              const local = get().users.find((u) => u.email === normalizedEmail);
              if (local) {
                const ok = await verifySecret(password, local.salt, local.passwordHash);
                if (ok) {
                  set({ currentUserId: local.id });
                  return { ok: true };
                }
              }
              return { ok: false, error: 'invalidCredentials' };
            }
            if (e instanceof CloudError && e.code === 'account_locked') {
              return { ok: false, error: 'accountLocked' };
            }
            if (!isOfflineError(e)) return { ok: false, error: 'invalidCredentials' };
            // Offline only: fall through to local verification.
            log.warn('auth: cloud unreachable, trying local login');
          }
        }

        const user = get().users.find((u) => u.email === normalizedEmail);
        if (!user) return { ok: false, error: 'invalidCredentials' };

        const ok = await verifySecret(password, user.salt, user.passwordHash);
        if (!ok) return { ok: false, error: 'invalidCredentials' };

        if (needsUpgrade(user.passwordHash)) {
          try {
            const newSalt = secureSalt();
            const newHash = hashSecret(password, newSalt);
            set({
              users: get().users.map((u) =>
                u.id === user.id ? { ...u, salt: newSalt, passwordHash: newHash } : u,
              ),
            });
          } catch (e) {
            log.warn('auth: password hash upgrade failed', e);
          }
        }

        set({ currentUserId: user.id });
        return { ok: true };
      },

      resetPassword: async (email, currentPassword, newPassword) => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !currentPassword) return { ok: false, error: 'fillAllFields' };
        const pwError = validatePassword(newPassword);
        if (pwError) return { ok: false, error: pwError };

        const user = get().users.find((u) => u.email === normalizedEmail);
        if (!user) return { ok: false, error: 'accountNotFound' };

        const currentOk = await verifySecret(currentPassword, user.salt, user.passwordHash);
        if (!currentOk) return { ok: false, error: 'invalidCredentials' };

        // Cloud: rotate authKey + kdfSalt and re-encrypt synced stores under the new encKey.
        if (isCloudEnabled()) {
          try {
            const session = await loadSession();
            let oldSalt = session?.kdfSalt || user.kdfSalt;
            if (!oldSalt) {
              const ch = await cloud.challenge(normalizedEmail);
              oldSalt = ch.kdfSalt;
            }
            const oldKeys = deriveKeys(currentPassword, oldSalt);
            const newKdfSalt = generateKdfSalt();
            const newKeys = deriveKeys(newPassword, newKdfSalt);

            // Ensure we have a session (user may be offline-local but cloud configured).
            if (!session) {
              const data = await cloud.login(normalizedEmail, oldKeys.authKey);
              await saveSession({
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                email: normalizedEmail,
                encKeyHex: oldKeys.encKeyHex,
                kdfSalt: data.kdfSalt || oldSalt,
              });
            }

            await cloud.changeCredentials(oldKeys.authKey, newKeys.authKey, newKdfSalt);
            await updateEncKey(newKeys.encKeyHex, newKdfSalt);
            // Re-issue session after server revoked refresh tokens.
            const relogin = await cloud.login(normalizedEmail, newKeys.authKey);
            await saveSession({
              accessToken: relogin.accessToken,
              refreshToken: relogin.refreshToken,
              email: normalizedEmail,
              encKeyHex: newKeys.encKeyHex,
              kdfSalt: newKdfSalt,
            });
            const { pushAllNow } = await import('../features/cloud/syncManager');
            await pushAllNow();
          } catch (e) {
            if (e instanceof CloudError && e.code === 'invalid_credentials') {
              return { ok: false, error: 'invalidCredentials' };
            }
            if (!isOfflineError(e)) {
              log.warn('auth: cloud password change failed', e);
              return { ok: false, error: 'invalidCredentials' };
            }
            // Offline: update local only (cloud will need change when back online).
            log.warn('auth: cloud unreachable during password change; updating local only');
          }
        }

        const salt = secureSalt();
        const passwordHash = hashSecret(newPassword, salt);
        set({
          users: get().users.map((u) =>
            u.id === user.id ? { ...u, salt, passwordHash } : u,
          ),
        });
        return { ok: true };
      },

      updateProfile: async (fullName) => {
        const name = fullName.trim();
        if (!name) return { ok: false, error: 'fillAllFields' };
        const { currentUserId, users } = get();
        if (!currentUserId) return { ok: false, error: 'fillAllFields' };
        set({
          users: users.map((u) => (u.id === currentUserId ? { ...u, fullName: name } : u)),
        });
        if (isCloudEnabled()) {
          try {
            await cloud.updateProfile(name);
          } catch (e) {
            log.warn('auth: cloud profile update failed', e);
          }
        }
        return { ok: true };
      },

      setAvatarUri: (uri) => {
        const { currentUserId, users } = get();
        if (!currentUserId) return;
        set({
          users: users.map((u) => (u.id === currentUserId ? { ...u, avatarUri: uri } : u)),
        });
      },

      logout: () => {
        set({ currentUserId: null });
        void (async () => {
          try {
            const session = await loadSession();
            if (session) {
              try {
                await cloud.logout(session.refreshToken);
              } catch {
                /* ignore */
              }
            }
          } finally {
            await clearSession();
          }
        })();
      },

      currentUser: () => {
        const { users, currentUserId } = get();
        return users.find((u) => u.id === currentUserId) ?? null;
      },
    }),
    {
      name: 'leftbehind-auth',
      storage: createJSONStorage(() => createSecureStorage()),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          log.warn('LeftBehind: failed to restore auth data, starting fresh.', error);
        }
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);
