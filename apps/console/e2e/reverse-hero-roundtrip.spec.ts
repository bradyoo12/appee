import { expect, test } from './fixtures/auth';

// #97 — round-trip: detail page CTA → /reverse?card=1&appId=... →
// click an option → POST server action → redirect back to /apps/[id]
// → hero badge reflects the chosen variant.
//
// No phone reflection (Slice 3+); this only proves the data plumbing.
test('hero variant round-trip persists and renders on detail', async ({ page, seededApp }) => {
  // 1) Land on detail page (auth fixture has injected the session cookie).
  await page.goto(`/apps/${seededApp.id}`);
  await expect(page.getByRole('heading', { name: seededApp.appName })).toBeVisible();

  // CTA should point at /reverse?card=1&appId=<seeded>.
  const cta = page.getByRole('link', { name: /이 앱 계속 다듬기/ });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', `/reverse?card=1&appId=${seededApp.id}`);

  // 2) Follow the CTA.
  await cta.click();
  await expect(page).toHaveURL(new RegExp(`/reverse\\?card=1&appId=${seededApp.id}`));

  // 3) Pick the second option (label '미니멀 + 보라 그라데이션' → variant 'mini').
  //    Each option is a submit button inside its own form when appId is present.
  const miniBtn = page.getByRole('button', { name: /미니멀 \+ 보라 그라데이션/ });
  await expect(miniBtn).toBeVisible();
  await miniBtn.click();

  // 4) Server action redirects back to /apps/[id].
  await page.waitForURL(`**/apps/${seededApp.id}`);

  // 5) Badge now reflects the persisted variant.
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

  // Re-enter and pick a different one.
  await page.getByRole('link', { name: /이 앱 계속 다듬기/ }).click();
  await page.getByRole('button', { name: /리스트 \+ 통계/ }).click();
  await page.waitForURL(`**/apps/${seededApp.id}`);
  await expect(page.getByTestId('hero-variant-badge')).toContainText('hero: list');
});
