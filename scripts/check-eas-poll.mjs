// Unit 5c E2E — Landing → /build (real EAS poll) → /install (real artifacts.buildUrl).
// Run: PORT=3001 node scripts/check-eas-poll.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '.screenshots');
await mkdir(outDir, { recursive: true });

const port = process.env.PORT ?? '3000';
const base = `http://localhost:${port}`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

page.on('pageerror', (err) => console.error('pageerror:', err.message));

await page.goto(`${base}/`);
console.log('1. landing:', page.url());

await page.getByRole('link', { name: /deploy hello world/i }).click();
await page.waitForURL('**/build?id=*');
console.log('2. on /build:', page.url());

const buildStatusText = async () => {
  const meta = await page.locator('span.text-zinc-400').first().textContent();
  return meta;
};
console.log('   meta header:', await buildStatusText());

await page.waitForURL('**/install?id=*', { timeout: 15000 });
console.log('3. on /install:', page.url());

await page.waitForLoadState('networkidle');
await page.screenshot({ path: join(outDir, 'install-real.png'), fullPage: true });

const labelText = await page.locator('p.font-mono.uppercase').first().textContent();
console.log('   QR label:', labelText);

const bodyText = await page.textContent('body');
const apkMatch = bodyText?.match(/expo\.dev[^\s"<>]*\.apk/i);
console.log('   APK URL on page:', apkMatch?.[0] ?? 'NOT FOUND');

await browser.close();
