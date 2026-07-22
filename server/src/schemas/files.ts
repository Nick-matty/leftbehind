import { z } from 'zod';

// Client-chosen file id, e.g. "doc-<uuid>". Restricted to safe characters.
export const fileIdParam = z.object({
  fileId: z.string().regex(/^[a-zA-Z0-9_.-]{1,128}$/, 'Invalid file id'),
});

// ciphertext + iv are opaque base64 the server never decrypts.
export const putFileSchema = z.object({
  // Keep under the Express MAX_BODY_SIZE (25mb) after JSON encoding (~18MB raw).
  ciphertext: z.string().min(1).max(24_000_000),
  iv: z.string().min(1).max(1024),
});

export type PutFileInput = z.infer<typeof putFileSchema>;
