import { expect, test } from './fixtures/auth';

// #102 — Deploy button must disable + show "빌드 시작 중..." while the Server
// Action is pending, so rapid double-clicks don't fire multiple EAS builds.
//
// Strategy: intercept the Server Action POST (Next.js posts to the page URL
// with a `next-action` header) and add an artificial 2s delay. That gives a
// measurable pending window without firing real EAS.
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

test('rapid double-click fires the Server Action only once', async ({
  page,
  seededApp: _seededApp,
}) => {
  let postCount = 0;
  await page.route('**/', async (route, request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) {
      postCount += 1;
      // Hold the response open so the second click sees disabled state.
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

  // First click → starts the Server Action. Don't await — fire and continue.
  const firstClick = button.click();
  // Wait just long enough for React to flush the pending state.
  await expect(button).toBeDisabled({ timeout: 500 });

  // Second click (rapid) — Playwright's click() respects disabled state by
  // default and times out. Use a short timeout + catch so the test doesn't
  // hang. Either outcome confirms the user can't fire a second submit.
  await button.click({ timeout: 200, trial: false }).catch(() => {
    /* expected: button is disabled */
  });

  await firstClick;

  // Wait for the intercepted POST to resolve.
  await page.waitForTimeout(2500);

  expect(postCount, 'Server Action should be called exactly once').toBe(1);
});
