// Verify landing → /build navigation on Deploy button click.
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

await page.goto(`${base}/`);
await page.screenshot({ path: join(outDir, 'landing.png') });

const initialUrl = page.url();
await page.getByRole('link', { name: /deploy hello world/i }).click();
await page.waitForURL('**/build', { timeout: 5000 });

console.log(JSON.stringify({
  initialUrl,
  afterClickUrl: page.url(),
  navigated: page.url().endsWith('/build'),
}, null, 2));

await browser.close();
