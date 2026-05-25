import { expect, test } from './fixtures/auth';

// Step A: detail-page CTA routes to /apps/[id]/refine.
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

// Step C: chat is now LLM-driven (Claude API). The dialog shape is no
// longer hardcoded, so we only assert the shell renders the chat thread
// and an input field. End-to-end of the API path is covered by manual
// verification on Vercel preview (requires ANTHROPIC_API_KEY).
test('refine chat shell renders intro + input', async ({ page, seededApp }) => {
  await page.goto(`/apps/${seededApp.id}/refine`);

  // Intro message from the assistant is visible.
  const thread = page.getByTestId('refine-thread');
  await expect(thread).toBeVisible();
  await expect(thread).toContainText(/어떤 화면을 추가/);

  // Text input + send button.
  await expect(page.getByLabel('message')).toBeVisible();
  await expect(page.getByTestId('refine-send')).toBeVisible();
});
