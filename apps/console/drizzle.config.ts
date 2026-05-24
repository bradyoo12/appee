import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit doesn't auto-load .env files; this is what Next.js does at
// runtime, replicated here so `pnpm db:push` / `db:generate` work outside Next.
config({ path: '.env.local' });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
