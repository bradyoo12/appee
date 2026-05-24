import { expect, test } from '@playwright/test';

// Baseline that proves the Playwright infrastructure is wired correctly:
// webServer launches `next dev`, baseURL resolves, and chromium can load a
// real page from the app. Targets /login because it's auth-free and stable.
test('login page renders with magic-link entry', async ({ page }) => {
  const res = await page.goto('/login');
  expect(res?.status(), 'GET /login should return 2xx').toBeLessThan(400);

  // Step label + headline come straight from app/login/page.tsx — stable
  // anchors. If either copy changes, update here too.
  await expect(page.getByText('step 1 · sign in')).toBeVisible();
  await expect(page.getByRole('heading', { name: /appee.*들어가기/ })).toBeVisible();

  // The two real CTAs (magic link + Google) should both be present.
  await expect(page.getByRole('button', { name: /매직 링크 보내기/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Google로 계속하기/ })).toBeVisible();
});
