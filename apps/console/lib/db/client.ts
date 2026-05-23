import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set. See apps/console/.env.local.example');
}

// `prepare: false` is required for Supabase's transaction-mode pooler
// (port 6543). Direct connections (5432) tolerate either setting.
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
