import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
  const t0 = Date.now();
  const rows = await sql`select now() as now`;
  console.log(`ok in ${Date.now() - t0}ms:`, rows[0]);
} catch (e) {
  console.error('failed:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
