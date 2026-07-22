import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

type Part = 'body' | 'params' | 'query';

/**
 * Validates and REPLACES the given request part with the parsed, typed value.
 * Anything not in the schema is stripped — untrusted input never flows through.
 */
export function validate<T extends ZodTypeAny>(schema: T, part: Part = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req[part]) as z.infer<T>;
    // req.query/params can be read-only getters in some setups; assign safely.
    (req as unknown as Record<Part, unknown>)[part] = parsed;
    next();
  };
}
