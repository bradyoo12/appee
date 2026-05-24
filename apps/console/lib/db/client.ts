import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Drizzle = ReturnType<typeof drizzle<typeof schema>>;

let cached: Drizzle | null = null;

function getDb(): Drizzle {
  if (cached) return cached;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set. See apps/console/.env.local.example');
  }
  // `prepare: false` is required for Supabase's transaction-mode pooler
  // (port 6543). Direct connections (5432) tolerate either setting.
  const client = postgres(connectionString, { prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}

// Lazy proxy: same call surface as a regular drizzle instance, but the
// underlying postgres client is only constructed on first runtime use.
// Lets `next build` import this module during page-data collection without
// DATABASE_URL being present in the build environment (Vercel sets it as a
// runtime env, not a build-time env).
export const db = new Proxy({} as Drizzle, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
