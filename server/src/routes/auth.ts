import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';
import { hashAuthKey, verifyAuthKey } from '../utils/crypto';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
} from '../utils/tokens';
import {
  registerSchema,
  loginSchema,
  challengeSchema,
  refreshSchema,
  logoutSchema,
  updateProfileSchema,
  changeCredentialsSchema,
} from '../schemas/auth';

export const authRouter = Router();

const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60_000;

function publicUser(u: { id: string; email: string; fullName: string; createdAt: Date }) {
  return { id: u.id, email: u.email, fullName: u.fullName, createdAt: u.createdAt };
}

async function issueSession(userId: string, userAgent?: string) {
  const accessToken = signAccessToken(userId);
  const refreshToken = await issueRefreshToken(userId, userAgent);
  return { accessToken, refreshToken };
}

/** Deterministic fake salt for unknown emails (anti-enumeration + constant work). */
function fakeSaltForEmail(email: string): string {
  return crypto.createHash('sha256').update(`lb-fake-salt:${email}`).digest('hex').slice(0, 32);
}

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, fullName, authKey, kdfSalt } = req.body as import('../schemas/auth').RegisterInput;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'An account with that email already exists.', 'email_in_use');

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        authHash: hashAuthKey(authKey),
        kdfSalt,
        failedLogins: 0,
        lockedUntil: null,
      },
    });

    const session = await issueSession(user.id, req.headers['user-agent']);
    res.status(201).json({ user: publicUser(user), kdfSalt: user.kdfSalt, ...session });
  }),
);

// Public challenge: returns the account's KDF salt (or a fake one) so the client
// can derive authKey without sending the password.
authRouter.post(
  '/challenge',
  authLimiter,
  validate(challengeSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as import('../schemas/auth').ChallengeInput;
    const user = await prisma.user.findUnique({ where: { email }, select: { kdfSalt: true } });
    if (!user) {
      res.json({ kdfSalt: fakeSaltForEmail(email), legacy: false });
      return;
    }
    const salt = user.kdfSalt?.trim()
      ? user.kdfSalt
      : `legacy:email:${email}`;
    res.json({ kdfSalt: salt, legacy: !user.kdfSalt?.trim() });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, authKey } = req.body as import('../schemas/auth').LoginInput;

    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new HttpError(429, 'Too many attempts. Try again later.', 'account_locked');
    }

    const ok = user
      ? verifyAuthKey(authKey, user.authHash)
      : verifyAuthKey(authKey, hashAuthKey('dummy-value-for-timing'));

    if (!user || !ok) {
      if (user) {
        const failedLogins = user.failedLogins + 1;
        const lockedUntil = failedLogins >= MAX_FAILED ? new Date(Date.now() + LOCKOUT_MS) : null;
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins, lockedUntil },
        });
      }
      throw new HttpError(401, 'Invalid email or password.', 'invalid_credentials');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null },
    });

    const session = await issueSession(user.id, req.headers['user-agent']);
    const kdfSalt = user.kdfSalt?.trim() ? user.kdfSalt : `legacy:email:${email}`;
    res.json({ user: publicUser(user), kdfSalt, ...session });
  }),
);

authRouter.post(
  '/refresh',
  authLimiter,
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const rotated = await rotateRefreshToken(refreshToken, req.headers['user-agent']);
    if (!rotated) throw new HttpError(401, 'Session expired. Please sign in again.', 'refresh_invalid');
    const accessToken = signAccessToken(rotated.userId);
    res.json({ accessToken, refreshToken: rotated.refreshToken });
  }),
);

authRouter.post(
  '/logout',
  validate(logoutSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw new HttpError(404, 'Account not found.', 'not_found');
    res.json({ user: publicUser(user) });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const { fullName } = req.body as { fullName: string };
    const user = await prisma.user.update({ where: { id: req.userId! }, data: { fullName } });
    res.json({ user: publicUser(user) });
  }),
);

authRouter.post(
  '/change-credentials',
  requireAuth,
  authLimiter,
  validate(changeCredentialsSchema),
  asyncHandler(async (req, res) => {
    const { currentAuthKey, newAuthKey, newKdfSalt } =
      req.body as import('../schemas/auth').ChangeCredentialsInput;
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw new HttpError(404, 'Account not found.', 'not_found');
    if (!verifyAuthKey(currentAuthKey, user.authHash)) {
      throw new HttpError(401, 'Current password is incorrect.', 'invalid_credentials');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        authHash: hashAuthKey(newAuthKey),
        kdfSalt: newKdfSalt,
        failedLogins: 0,
        lockedUntil: null,
      },
    });
    await revokeAllForUser(user.id);
    res.status(204).send();
  }),
);

authRouter.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.user.delete({ where: { id: req.userId! } });
    res.status(204).send();
  }),
);
