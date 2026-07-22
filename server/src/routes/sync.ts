import { Router } from 'express';
import { prisma } from '../db';
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
    const blobs = await prisma.vaultBlob.findMany({
      where: { userId: req.userId! },
      select: { storeKey: true, ciphertext: true, iv: true, rev: true, updatedAt: true },
    });
    res.json({ blobs });
  }),
);

// Lightweight revision map so the client can decide what to pull.
syncRouter.get(
  '/revisions',
  asyncHandler(async (req, res) => {
    const blobs = await prisma.vaultBlob.findMany({
      where: { userId: req.userId! },
      select: { storeKey: true, rev: true, updatedAt: true },
    });
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

    const existing = await prisma.vaultBlob.findUnique({
      where: { userId_storeKey: { userId, storeKey } },
      select: { rev: true },
    });

    if (existing && typeof baseRev === 'number' && baseRev !== existing.rev) {
      // Someone else (another device) updated this store first.
      throw new HttpError(409, 'This data changed on another device. Pull latest and retry.', 'revision_conflict');
    }

    const nextRev = (existing?.rev ?? 0) + 1;
    const saved = await prisma.vaultBlob.upsert({
      where: { userId_storeKey: { userId, storeKey } },
      create: { userId, storeKey, ciphertext, iv, rev: nextRev },
      update: { ciphertext, iv, rev: nextRev },
      select: { storeKey: true, rev: true, updatedAt: true },
    });
    res.json({ blob: saved });
  }),
);

syncRouter.delete(
  '/:storeKey',
  validate(storeKeyParam, 'params'),
  asyncHandler(async (req, res) => {
    const { storeKey } = req.params as unknown as { storeKey: string };
    await prisma.vaultBlob.deleteMany({ where: { userId: req.userId!, storeKey } });
    res.status(204).send();
  }),
);
