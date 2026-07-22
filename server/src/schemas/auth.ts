import { z } from 'zod';

// The client sends `authKey` — a password-derived credential (hex). The raw
// password is NEVER transmitted.
const authKey = z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid auth key');
const kdfSalt = z
  .string()
  .min(16)
  .max(128)
  .regex(/^(?:[a-f0-9]+|legacy:email:.+)$/i, 'Invalid KDF salt');

export const registerSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.trim().toLowerCase()),
  fullName: z.string().trim().min(1).max(120),
  authKey,
  kdfSalt,
});

export const challengeSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.trim().toLowerCase()),
});

export const loginSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.trim().toLowerCase()),
  authKey,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).max(512),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10).max(512),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
});

export const changeCredentialsSchema = z.object({
  currentAuthKey: authKey,
  newAuthKey: authKey,
  newKdfSalt: kdfSalt,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChallengeInput = z.infer<typeof challengeSchema>;
export type ChangeCredentialsInput = z.infer<typeof changeCredentialsSchema>;
