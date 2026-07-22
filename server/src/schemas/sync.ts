import { z } from 'zod';

// Allowed logical stores that may be synced. Auth and device-only security PIN
// are intentionally excluded.
export const STORE_KEYS = ['travel', 'app', 'assistant', 'settings'] as const;

export const storeKeyParam = z.object({
  storeKey: z.enum(STORE_KEYS),
});

// ciphertext + iv are opaque base64 the server never decrypts.
const base64 = z.string().min(1).max(12_000_000); // ~9 MB ceiling

export const putBlobSchema = z.object({
  ciphertext: base64,
  iv: z.string().min(1).max(1024),
  // Client's known base revision, for optimistic concurrency (optional).
  baseRev: z.number().int().nonnegative().optional(),
});

export type PutBlobInput = z.infer<typeof putBlobSchema>;
