import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger';

/** Thrown by route handlers for expected, client-facing errors. */
export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = 'error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found', code: 'not_found' });
}

// Centralized error handler. Never leaks stack traces, SQL, or internals.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request',
      code: 'validation_error',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }

  // Unknown/unexpected: log server-side with detail, return generic to client.
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error', code: 'internal_error' });
}
