import { Router } from 'express';
import { query } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { syncLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';
import { storeKeyParam, putBlobSchema } from '../schemas/sync';

// Every route here is authenticated and strictly scoped to req.userId — a user
// can only ever read/write their OWN encrypted blobs. The server cannot decrypt
// any of it (zero-knowledge).
export const syncRouter = Router();

syncRouter.use(requireAuth, syncLimiter);

// Pull all encrypted blobs (metadata + ciphertext) for the current user.
syncRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows: blobs } = await query(
      'SELECT storeKey, ciphertext, iv, rev, updatedAt FROM vaultBlob WHERE userId = $1',
      [req.userId]
    );
    res.json({ blobs });
  }),
);

// Lightweight revision map so the client can decide what to pull.
syncRouter.get(
  '/revisions',
  asyncHandler(async (req, res) => {
    const { rows: blobs } = await query(
      'SELECT storeKey, rev, updatedAt FROM vaultBlob WHERE userId = $1',
      [req.userId]
    );
    res.json({ revisions: blobs });
  }),
);

// Upsert one store's encrypted blob (last-write-wins with optional optimistic
// concurrency via baseRev).
syncRouter.put(
  '/:storeKey',
  validate(storeKeyParam, 'params'),
  validate(putBlobSchema),
  asyncHandler(async (req, res) => {
    const { storeKey } = req.params as unknown as { storeKey: string };
    const { ciphertext, iv, baseRev } = req.body as import('../schemas/sync').PutBlobInput;
    const userId = req.userId!;

    const { rows: [existing] } = await query(
      'SELECT rev FROM vaultBlob WHERE userId_storeKey = $1 AND userId = $2',
      [storeKey, userId]
    );

    if (existing && typeof baseRev === 'number' && baseRev !== existing.rev) {
      // Someone else (another device) updated this store first.
      throw new HttpError(409, 'This data changed on another device. Pull latest and retry.', 'revision_conflict');
    }

    const existingRev = existing?.rev as number | undefined;
    const nextRev = (existingRev ?? 0) + 1;
    await query(
      `INSERT INTO vaultBlob (userId, storeKey, ciphertext, iv, rev)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (userId_storeKey) DO UPDATE SET ciphertext = EXCLUDED.ciphertext, iv = EXCLUDED.iv, rev = EXCLUDED.rev`,
      [userId, storeKey, ciphertext, iv, nextRev]
    );
    res.json({ blob: { storeKey, rev: nextRev, updatedAt: new Date() } });
  }),
);

syncRouter.delete(
  '/:storeKey',
  validate(storeKeyParam, 'params'),
  asyncHandler(async (req, res) => {
    const { storeKey } = req.params as unknown as { storeKey: string };
    await query(
      'DELETE FROM vaultBlob WHERE userId = $1 AND storeKey = $2',
      [req.userId, storeKey]
    );
    res.status(204).send();
  }),
);

export default syncRouter;