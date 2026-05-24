import { expect, test } from './fixtures/auth';

// #102 + #104 — Deploy button must disable + show "빌드 시작 중..." while the
// Server Action is pending, AND block rapid synchronous clicks before React
// has re-rendered (the original useFormStatus + disabled fix from #102 had a
// race the user reproduced in #104).
//
// Strategy: intercept the Server Action POST (Next 15 fires it as POST to the
// page URL with a `next-action` header). Add a 2s delay so the pending window
// is observable, then return a redirect-equivalent.
//
// Auth fixture skips when SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL unset, so
// this stays CI-quiet until secrets land.

test('deploy button disables + shows "빌드 시작 중..." while pending', async ({
  page,
  seededApp: _seededApp,
}) => {
  // Intercept Server Action POST to landing page — Next 15 fires it as POST
  // to the same URL with a `next-action` header. Delay 2s so the pending
  // window is comfortably observable, then return a redirect-equivalent.
  await page.route('**/', async (route, request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) {
      await new Promise((r) => setTimeout(r, 2000));
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/x-component' },
        body: '',
      });
    }
    return route.continue();
  });

  await page.goto('/');

  const button = page.getByTestId('deploy-submit');
  await expect(button).toBeEnabled();
  await expect(button).toHaveText(/Deploy hello world/);

  // Click and immediately check that pending state took effect.
  await button.click();

  await expect(button).toBeDisabled({ timeout: 500 });
  await expect(button).toContainText('빌드 시작 중');

  // Textarea also disables.
  await expect(page.locator('textarea[name="headline"]')).toBeDisabled();
});

test('rapid synchronous clicks fire the Server Action only once (#104 race)', async ({
  page,
  seededApp: _seededApp,
}) => {
  let postCount = 0;
  await page.route('**/', async (route, request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) {
      postCount += 1;
      await new Promise((r) => setTimeout(r, 1500));
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/x-component' },
        body: '',
      });
    }
    return route.continue();
  });

  await page.goto('/');
  const button = page.getByTestId('deploy-submit');
  await expect(button).toBeEnabled();

  // The race #104 demonstrated: 3-5 clicks fire synchronously, before React
  // has re-rendered the button as disabled. Reproduce by triggering all
  // clicks in the browser context within a single JS tick.
  await page.evaluate(() => {
    const btn = document.querySelector<HTMLButtonElement>('[data-testid="deploy-submit"]');
    if (!btn) throw new Error('deploy-submit not found');
    btn.click();
    btn.click();
    btn.click();
    btn.click();
    btn.click();
  });

  // Wait for the intercepted Server Action to resolve.
  await page.waitForTimeout(2500);

  expect(
    postCount,
    'Server Action should be called exactly once even on 5x synchronous clicks',
  ).toBe(1);
});
