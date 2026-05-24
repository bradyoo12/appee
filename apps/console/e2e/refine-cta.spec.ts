import { expect, test } from './fixtures/auth';

// Step A: detail-page CTA "이 앱 계속 다듬기" routes to /apps/[id]/refine,
// which currently shows an empty chat shell. Real LLM dialog comes in Step C.
test('detail CTA lands on refine chat shell', async ({ page, seededApp }) => {
  await page.goto(`/apps/${seededApp.id}`);

  const cta = page.getByRole('link', { name: /이 앱 계속 다듬기/ });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', `/apps/${seededApp.id}/refine`);

  await cta.click();
  await page.waitForURL(`**/apps/${seededApp.id}/refine`);

  await expect(page.getByTestId('refine-chat-shell')).toBeVisible();
  await expect(page.getByRole('heading', { name: seededApp.appName })).toBeVisible();
});

test('refine page back link returns to detail', async ({ page, seededApp }) => {
  await page.goto(`/apps/${seededApp.id}/refine`);
  await page.getByRole('link', { name: /앱 상세/ }).click();
  await page.waitForURL(`**/apps/${seededApp.id}`);
});
