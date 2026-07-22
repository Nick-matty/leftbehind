import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env';
import { prisma } from '../db';
import { randomToken, sha256Hex } from './crypto';

export interface AccessTokenPayload {
  sub: string; // userId
  type: 'access';
}

export function signAccessToken(userId: string): string {
  const options: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId, type: 'access' } satisfies AccessTokenPayload, env.ACCESS_TOKEN_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
  if (decoded.type !== 'access') throw new Error('Wrong token type');
  return decoded;
}

/**
 * Issue an opaque refresh token, storing only its SHA-256 hash. Returns the raw
 * token (shown to the client once). The DB row id lets us build a rotation chain.
 */
export async function issueRefreshToken(userId: string, userAgent?: string): Promise<string> {
  const raw = randomToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: sha256Hex(raw), expiresAt, userAgent: userAgent?.slice(0, 256) },
  });
  return raw;
}

export interface RotationResult {
  userId: string;
  refreshToken: string;
}

/**
 * Validate + rotate a refresh token. Implements reuse detection: if a token that
 * was already revoked is presented, we revoke the entire user's token family
 * (likely theft).
 */
export async function rotateRefreshToken(rawToken: string, userAgent?: string): Promise<RotationResult | null> {
  const tokenHash = sha256Hex(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing) return null;

  // Reuse of an already-revoked token => compromise. Nuke the family.
  if (existing.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
    return null;
  }

  const newRaw = randomToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: sha256Hex(newRaw),
        expiresAt,
        userAgent: userAgent?.slice(0, 256),
      },
    });
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBy: created.id },
    });
  });

  return { userId: existing.userId, refreshToken: newRaw };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = sha256Hex(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
