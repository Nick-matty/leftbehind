import { Pool } from 'pg';
import { env } from '../env';
import { sha256Hex } from './crypto';
import { pgPool } from '../db';

export interface RotationResult {
  refreshToken: string;
  accessToken: string;
  userId: string;
}

/** Generate a random refresh token string. */
async function generateRandomToken(): Promise<string> {
  return new Promise<string>((resolve, _reject) => {
    require('crypto').randomBytes(32, (err: Error, buffer: Buffer) => {
      resolve(buffer.toString('hex'));
    });
  });
}

/** Sign an access token for a user. */
export function signAccessToken(userId: string): string {
  // In a real implementation, this would use JWT
  // For now, return a placeholder
  return `placeholder-access-token-${userId}`;
}

/**
 * Verify an access token and return the payload.
 */
export function verifyAccessToken(token: string): { sub: string; type: 'access' } {
  // In a real implementation, this would use JWT
  // For now, return a placeholder
  return { sub: token, type: 'access' };
}

/**
 * Issue an opaque refresh token, storing only its SHA-256 hash.
 * Returns the raw token (shown to the client once).
 * The DB row id lets us build a rotation chain.
 */
export async function issueRefreshToken(userId: string, userAgent?: string): Promise<string> {
  const raw = await generateRandomToken();
  const expiresAt = new Date(Date.now() + (env.REFRESH_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000);
  const tokenHash = sha256Hex(raw);

  await pgPool.query(
    'INSERT INTO refresh_token (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );

  return raw;
}

/**
 * Validate + rotate a refresh token. Implements reuse detection:
 * if a token that was already revoked is presented, revoke the entire user's token family.
 */
export async function rotateRefreshToken(rawToken: string, userAgent?: string): Promise<RotationResult | null> {
  const tokenHash = sha256Hex(rawToken);
  const { rows: [existing] } = await pgPool.query(
    'SELECT * FROM refresh_token WHERE token_hash = $1',
    [tokenHash]
  );
  if (!existing) return null;

  // Reuse of an already-revoked token => compromise. Nuke the family.
  if (existing.revoked_at) {
    await pgPool.query(
      'UPDATE refresh_token SET revoked_at = now(), replaced_by = $1 WHERE user_id = $2',
      [existing.id, existing.user_id]
    );
    await pgPool.query(
      'DELETE FROM refresh_token WHERE user_id = $1 AND id != $2',
      [existing.user_id, existing.id]
    );
    return null;
  }

  const newRaw = await generateRandomToken();
  const newTokenHash = sha256Hex(newRaw);
  const expiresAt = new Date(Date.now() + (env.REFRESH_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000);

  await pgPool.query(
    'INSERT INTO refresh_token (user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, $3, $4)',
    [existing.user_id, newTokenHash, expiresAt, userAgent?.slice(0, 256)]
  );

  // Revoke old token
  await pgPool.query(
    'UPDATE refresh_token SET revoked_at = now(), replaced_by = $1 WHERE id = $2',
    [existing.id, existing.id]
  );

  const accessToken = signAccessToken(existing.user_id);

  return {
    refreshToken: newRaw,
    accessToken,
    userId: existing.user_id,
  };
}

/** Revoke a refresh token. */
export function revokeRefreshToken(refreshToken: string): void {
  // Implementation would hash and revoke in DB
}

/** Revoke all refresh tokens for a user. */
export function revokeAllForUser(userId: string): void {
  // Implementation would revoke all tokens for a user
}