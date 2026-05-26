import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// Apply hand-written RLS SQL files in lib/db/rls/.
// Run: node --env-file=.env.local scripts/apply-rls.mjs
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rlsDir = join(__dirname, '..', 'lib', 'db', 'rls');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
  const files = readdirSync(rlsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) {
    const path = join(rlsDir, f);
    const text = readFileSync(path, 'utf-8');
    console.log(`-- applying ${f} --`);
    await sql.unsafe(text);
    console.log('   ✓');
  }
} catch (e) {
  console.error('failed:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
