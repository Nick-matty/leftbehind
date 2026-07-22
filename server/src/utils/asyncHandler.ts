import type { NextFunction, Request, Response } from 'express';

// Express 4 does not forward rejected promises to the error handler. Wrap async
// route handlers so thrown/rejected errors reach errorHandler.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
