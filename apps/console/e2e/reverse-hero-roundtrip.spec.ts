import { expect, test } from './fixtures/auth';

// #97 — round-trip for /reverse: pick an option → POST server action →
// redirect back to /apps/[id] → hero badge reflects the chosen variant.
//
// Entry is via direct navigation now that the detail-page CTA routes to
// the dialog shell at /apps/[id]/refine (see refine-cta.spec.ts).
test('hero variant round-trip persists and renders on detail', async ({ page, seededApp }) => {
  // 1) Enter the reverse-card picker directly.
  await page.goto(`/reverse?card=1&appId=${seededApp.id}`);

  // 2) Pick the second option (label '미니멀 + 보라 그라데이션' → variant 'mini').
  const miniBtn = page.getByRole('button', { name: /미니멀 \+ 보라 그라데이션/ });
  await expect(miniBtn).toBeVisible();
  await miniBtn.click();

  // 3) Server action redirects back to /apps/[id].
  await page.waitForURL(`**/apps/${seededApp.id}`);

  // 4) Badge now reflects the persisted variant.
  const badge = page.getByTestId('hero-variant-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('hero: mini');
});

test('overwriting hero variant replaces the previous value', async ({ page, seededApp }) => {
  // First selection.
  await page.goto(`/reverse?card=1&appId=${seededApp.id}`);
  await page.getByRole('button', { name: /따뜻한 카드/ }).click();
  await page.waitForURL(`**/apps/${seededApp.id}`);
  await expect(page.getByTestId('hero-variant-badge')).toContainText('hero: warm');

  // Re-enter directly and pick a different one.
  await page.goto(`/reverse?card=1&appId=${seededApp.id}`);
  await page.getByRole('button', { name: /리스트 \+ 통계/ }).click();
  await page.waitForURL(`**/apps/${seededApp.id}`);
  await expect(page.getByTestId('hero-variant-badge')).toContainText('hero: list');
});
