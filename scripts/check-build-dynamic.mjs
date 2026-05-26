import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Verify /build dynamic progression: dots advance over time + auto-navigates to /install.
// Usage: PORT=3001 node scripts/check-build-dynamic.mjs
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '.screenshots');
await mkdir(outDir, { recursive: true });

const port = process.env.PORT ?? '3000';
const base = `http://localhost:${port}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

await page.goto(`${base}/build`);

async function dotColors() {
  return page.$$eval('ol li span', (els) => els.map((el) => getComputedStyle(el).backgroundColor));
}

const snapshots = [];
snapshots.push({ t: 0, url: page.url(), dots: await dotColors() });
await page.screenshot({ path: join(outDir, 'build-dynamic-t0.png') });

for (let i = 1; i <= 5; i++) {
  await page.waitForTimeout(2100);
  snapshots.push({ t: i * 2.1, url: page.url(), dots: await dotColors().catch(() => 'navigated') });
}

try {
  await page.waitForURL('**/install', { timeout: 5000 });
  snapshots.push({ t: 'after-navigate', url: page.url() });
  await page.screenshot({ path: join(outDir, 'build-dynamic-installed.png') });
} catch {
  snapshots.push({ t: 'after-navigate', url: page.url(), error: 'did not navigate to /install' });
}

console.log(JSON.stringify(snapshots, null, 2));
await browser.close();
