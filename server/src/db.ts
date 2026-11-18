import { Pool } from 'pg';
import { env } from './env';

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Helper to extract rows from pg query results with proper typing.
// Returns { rows: T[]; rowCount?: number } so we can access both count and data.
export async function query<T extends { [k: string]: unknown }>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount?: number }> {
  const { rows } = await pgPool.query(text, params) as { rows: T[]; rowCount: number };
  return { rows };
}

export async function connectDb(): Promise<void> {
  // pgPool will connect on first query
}

export async function disconnectDb(): Promise<void> {
  await pgPool.end();
}