import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGINS: z.string().default(''),
  MAX_BODY_SIZE: z.string().default('25mb'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a clear message — never boot a misconfigured security service.
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

// In production, refuse to run with an obviously weak/default secret.
if (env.isProd && env.ACCESS_TOKEN_SECRET.includes('replace-with')) {
  console.error('Refusing to start in production with the placeholder ACCESS_TOKEN_SECRET.');
  process.exit(1);
}
