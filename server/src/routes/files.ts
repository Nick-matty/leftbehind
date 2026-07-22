import { Router } from 'express';
import { prisma } from '../db';
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
    const files = await prisma.vaultFile.findMany({
      where: { userId: req.userId! },
      select: { fileId: true, rev: true, updatedAt: true },
    });
    res.json({ files });
  }),
);

filesRouter.get(
  '/:fileId',
  validate(fileIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { fileId } = req.params as unknown as { fileId: string };
    const file = await prisma.vaultFile.findUnique({
      where: { userId_fileId: { userId: req.userId!, fileId } },
      select: { fileId: true, ciphertext: true, iv: true, rev: true, updatedAt: true },
    });
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

    const existing = await prisma.vaultFile.findUnique({
      where: { userId_fileId: { userId, fileId } },
      select: { rev: true },
    });
    const nextRev = (existing?.rev ?? 0) + 1;

    const saved = await prisma.vaultFile.upsert({
      where: { userId_fileId: { userId, fileId } },
      create: { userId, fileId, ciphertext, iv, rev: nextRev },
      update: { ciphertext, iv, rev: nextRev },
      select: { fileId: true, rev: true, updatedAt: true },
    });
    res.json({ file: saved });
  }),
);

filesRouter.delete(
  '/:fileId',
  validate(fileIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { fileId } = req.params as unknown as { fileId: string };
    await prisma.vaultFile.deleteMany({ where: { userId: req.userId!, fileId } });
    res.status(204).send();
  }),
);
