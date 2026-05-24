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

// Step B: scripted Q&A → 3 recommended UI patterns → pick one → confirmation.
// No LLM, no DB write — just validates the UX shape.
test('refine scripted dialog walks to pattern pick + confirmation', async ({ page, seededApp }) => {
  await page.goto(`/apps/${seededApp.id}/refine`);

  // Q1: 주 행동
  await page.getByRole('button', { name: '훑어보기 · 탐색' }).click();

  // Q2: 정보 밀도
  await page.getByRole('button', { name: '많이 한눈에' }).click();

  // Q3: 콘텐츠 종류
  await page.getByRole('button', { name: '이미지 · 사진' }).click();

  // 3 옵션 노출
  const options = page.getByTestId('refine-options');
  await expect(options).toBeVisible();
  await expect(options.getByRole('button')).toHaveCount(3);

  // 픽 — image-heavy browse + dense 조합이면 'grid'가 상위에 있어야 함
  await page.getByTestId('refine-option-grid').click();

  // 픽 확인 상태
  await expect(page.getByTestId('refine-picked-confirmation')).toBeVisible();
  await expect(page.getByRole('button', { name: /코드 생성 시작/ })).toBeDisabled();
});
