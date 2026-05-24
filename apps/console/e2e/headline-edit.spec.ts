import { expect, test } from './fixtures/auth';

// #100 — round-trip for headline edit on the detail page.
// Reuses the auth fixture introduced by #97 (skips when env unset).

test('edit → save persists new headline + auto-derived app_name', async ({ page, seededApp }) => {
  await page.goto(`/apps/${seededApp.id}`);
  await expect(page.getByRole('heading', { name: seededApp.appName })).toBeVisible();

  // ✎ → edit mode
  await page.getByTestId('headline-edit-button').click();
  await expect(page).toHaveURL(new RegExp(`/apps/${seededApp.id}\\?edit=headline$`));
  await expect(page.getByTestId('headline-edit-form')).toBeVisible();

  // Type a new headline that crosses the 10-char boundary so app_name also
  // visibly changes (first 10 chars).
  const newHeadline = '아침 명상 알람 — 매일 7시 부드럽게';
  const textarea = page.getByLabel('headline');
  await textarea.fill(newHeadline);

  await page.getByRole('button', { name: '저장' }).click();

  // Server action redirects back to /apps/[id] without ?edit.
  await page.waitForURL(`**/apps/${seededApp.id}`);

  // New headline visible.
  await expect(page.locator('p').filter({ hasText: newHeadline })).toBeVisible();
  // app_name (the <h1>) reflects first 10 chars (trimmed) of the new headline.
  const expectedAppName = newHeadline.slice(0, 10).trim();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(expectedAppName);
});

test('cancel returns to read-only without changing anything', async ({ page, seededApp }) => {
  const originalHeadline = seededApp.headline;
  await page.goto(`/apps/${seededApp.id}?edit=headline`);
  await expect(page.getByTestId('headline-edit-form')).toBeVisible();

  // Type something but cancel instead of saving.
  await page.getByLabel('headline').fill('이건 저장 안 될 텍스트');
  await page.getByRole('link', { name: '취소' }).click();

  await expect(page).toHaveURL(`**/apps/${seededApp.id}`.replace('**', new URL(page.url()).origin));

  // Form gone, original headline still there.
  await expect(page.getByTestId('headline-edit-form')).not.toBeVisible();
  await expect(page.locator('p').filter({ hasText: originalHeadline })).toBeVisible();
});

test('rejects invalid: empty headline fails validation', async ({ page, seededApp }) => {
  await page.goto(`/apps/${seededApp.id}?edit=headline`);
  const textarea = page.getByLabel('headline');
  await textarea.fill('   '); // whitespace-only

  // Browser-level `required` blocks submit OR the server zod schema throws.
  // Either way we should NOT see a successful redirect that strips ?edit.
  // Use a short race: fire the click, then assert we're still on the edit URL
  // (browser validation kept us put) — or that the form responded with a
  // Next.js error page (server-side rejection).
  await page.getByRole('button', { name: '저장' }).click();

  // Wait briefly for either outcome.
  await page.waitForTimeout(500);

  // Two acceptable outcomes:
  //  (a) URL still has ?edit=headline (browser blocked submit)
  //  (b) we landed on a Next.js error page (server zod threw)
  // Either proves invalid input was rejected.
  const url = page.url();
  const stillEditing = url.includes('?edit=headline');
  const errorPage = await page
    .locator('body')
    .textContent()
    .then((t) => (t ?? '').includes('Application error') || (t ?? '').includes('500'));
  expect(stillEditing || errorPage, `URL=${url}`).toBe(true);
});
