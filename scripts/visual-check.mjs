import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Quick visual check via Playwright.
// Usage: node scripts/visual-check.mjs <path> [outName]
//   node scripts/visual-check.mjs /build build
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '.screenshots');
await mkdir(outDir, { recursive: true });

const pathname = process.argv[2] ?? '/';
const outName = process.argv[3] ?? (pathname.replace(/^\/|\W+/g, '_') || 'home');

const port = process.env.PORT ?? '3000';
const url = `http://localhost:${port}${pathname}`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

await page.goto(url, { waitUntil: 'networkidle' });

const outPath = join(outDir, `${outName}.png`);
await page.screenshot({ path: outPath, fullPage: true });
console.log(`screenshot: ${outPath}`);

// Pull computed styles for the elements we care about on /build.
if (pathname === '/build') {
  const probes = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return { selector: sel, found: false };
      const cs = getComputedStyle(el);
      return {
        selector: sel,
        found: true,
        tagName: el.tagName,
        className: el.className,
        display: cs.display,
        width: cs.width,
        height: cs.height,
        maxWidth: cs.maxWidth,
        justifyContent: cs.justifyContent,
        backgroundColor: cs.backgroundColor,
        flexShrink: cs.flexShrink,
      };
    };

    const dot = document.querySelector('ol li span');
    const dotInfo = dot
      ? {
          found: true,
          className: dot.className,
          ...['display', 'width', 'height', 'backgroundColor', 'flexShrink', 'boxShadow'].reduce(
            (acc, k) => {
              acc[k] = getComputedStyle(dot)[k];
              return acc;
            },
            {},
          ),
        }
      : { found: false };

    return {
      outer: pick('main > div'),
      card: pick('main > div > div'),
      header: pick('main > div > div > div:first-child'),
      firstDot: dotInfo,
      progressTrack: pick('main > div > div > div:last-child'),
    };
  });
  console.log(JSON.stringify(probes, null, 2));
}

await browser.close();
