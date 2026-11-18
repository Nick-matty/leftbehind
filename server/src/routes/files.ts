import { Router } from 'express';
import { query } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { syncLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';
import { fileIdParam, putFileSchema } from '../schemas/files';

// Encrypted file blobs (e.g. document photos). Like /sync, these are opaque
// ciphertext scoped strictly to the authenticated user — the server can never
// decrypt them.
export const filesRouter = Router();

filesRouter.use(requireAuth, syncLimiter);

// List file metadata (no ciphertext).
filesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows: files } = await query(
      'SELECT fileId, rev, updatedAt FROM vaultFile WHERE userId = $1',
      [req.userId]
    );
    res.json({ files });
  }),
);

filesRouter.get(
  '/:fileId',
  validate(fileIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { fileId } = req.params as unknown as { fileId: string };
    const { rows: [file] } = await query(
      'SELECT fileId, ciphertext, iv, rev, updatedAt FROM vaultFile WHERE userId_fileId = $1 AND userId = $2',
      [fileId, req.userId]
    );
    if (!file) throw new HttpError(404, 'File not found', 'not_found');
    res.json({ file });
  }),
);

filesRouter.put(
  '/:fileId',
  validate(fileIdParam, 'params'),
  validate(putFileSchema),
  asyncHandler(async (req, res) => {
    const { fileId } = req.params as unknown as { fileId: string };
    const { ciphertext, iv } = req.body as import('../schemas/files').PutFileInput;
    const userId = req.userId!;

    // Check existing revision for optimistic concurrency
    const { rows: [existing] } = await query(
      'SELECT rev FROM vaultFile WHERE userId_fileId = $1 AND userId = $2',
      [fileId, userId]
    );

    const existingRev = existing?.rev as number | undefined;
    const nextRev = (existingRev ?? 0) + 1;
    await query(
      `INSERT INTO vaultFile (userId, fileId, ciphertext, iv, rev)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (userId_fileId) DO UPDATE SET ciphertext = EXCLUDED.ciphertext, iv = EXCLUDED.iv, rev = EXCLUDED.rev`,
      [userId, fileId, ciphertext, iv, nextRev]
    );
    res.json({ file: { fileId, rev: nextRev } });
  }),
);

filesRouter.delete(
  '/:fileId',
  validate(fileIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { fileId } = req.params as unknown as { fileId: string };
    await query(
      'DELETE FROM vaultFile WHERE userId = $1 AND fileId = $2',
      [req.userId, fileId]
    );
    res.status(204).send();
  }),
);

export default filesRouter;