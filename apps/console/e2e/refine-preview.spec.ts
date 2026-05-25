import { expect, test } from './fixtures/auth';

// Step #115: preview phase + approve gate.
// We mock /api/refine/chat (Haiku) and /api/refine/preview (Sonnet) to keep
// the test deterministic + free. Real-API smoke happens on Vercel preview.
test('preview phase renders mockup iframe + plan after pattern pick, then approves', async ({
  page,
  seededApp,
}) => {
  // Mock chat → directly emit options on first user message
  await page.route('**/api/refine/chat', (route) =>
    route.fulfill({
      json: {
        phase: 'options',
        assistantMessage:
          '좋아요. 답해주신 내용으로 가장 잘 맞을 만한 화면 형태 3가지를 추천드릴게요.',
        recommendedPatterns: ['grid', 'card', 'fullscreen'],
        summary: '친구들 사진을 한눈에 보는 갤러리 화면',
      },
    }),
  );

  // Mock preview → fixed mockup + plan
  await page.route('**/api/refine/preview', (route) =>
    route.fulfill({
      json: {
        mockupHtml:
          '<div class="grid grid-cols-2 gap-2 p-4"><div class="aspect-square bg-orange-200 rounded"></div><div class="aspect-square bg-emerald-200 rounded"></div></div>',
        planMarkdown:
          '### 화면 한 줄 요약\n친구들 사진 갤러리.\n\n### 변경/추가 파일\n- templates/expo-base/app/(tabs)/gallery.tsx 신규',
      },
    }),
  );

  await page.goto(`/apps/${seededApp.id}/refine`);

  // Trigger options phase
  await page.getByLabel('message').fill('사진 갤러리 만들고 싶어요');
  await page.getByTestId('refine-send').click();

  // Options visible
  await expect(page.getByTestId('refine-options')).toBeVisible();

  // Pick grid → preview phase
  await page.getByTestId('refine-option-grid').click();

  // Preview container + mockup iframe + plan all visible
  const preview = page.getByTestId('refine-preview');
  await expect(preview).toBeVisible();
  await expect(page.getByTestId('refine-preview-mockup')).toBeVisible();
  await expect(page.getByTestId('refine-preview-plan')).toContainText('화면 한 줄 요약');

  // Approve → approved phase + disabled "코드 생성 시작" button
  await page.getByTestId('refine-preview-approve').click();
  await expect(page.getByTestId('refine-picked-confirmation')).toBeVisible();
  await expect(page.getByRole('button', { name: /코드 생성 시작/ })).toBeDisabled();
});

test('revision request fires preview API again with previous mockup', async ({
  page,
  seededApp,
}) => {
  let previewCallCount = 0;
  const seenBodies: string[] = [];

  await page.route('**/api/refine/chat', (route) =>
    route.fulfill({
      json: {
        phase: 'options',
        assistantMessage: '추천드릴게요.',
        recommendedPatterns: ['list', 'card', 'grid'],
        summary: '가계부',
      },
    }),
  );

  await page.route('**/api/refine/preview', (route) => {
    previewCallCount++;
    seenBodies.push(route.request().postData() ?? '');
    route.fulfill({
      json: {
        mockupHtml: `<div class="p-4 text-zinc-900">version ${previewCallCount}</div>`,
        planMarkdown: `### v${previewCallCount}\n- file.tsx`,
      },
    });
  });

  await page.goto(`/apps/${seededApp.id}/refine`);
  await page.getByLabel('message').fill('가계부 만들고 싶어요');
  await page.getByTestId('refine-send').click();
  await page.getByTestId('refine-option-list').click();
  await expect(page.getByTestId('refine-preview-plan')).toContainText('v1');

  // Open revision form
  await page.getByTestId('refine-preview-revise').click();
  await page.getByLabel('어떻게 바꿀까요?').fill('더 미니멀하게');
  await page.getByRole('button', { name: '다시 만들기' }).click();

  // Second preview rendered
  await expect(page.getByTestId('refine-preview-plan')).toContainText('v2');
  expect(previewCallCount).toBe(2);

  // Second request body must contain the prior mockup HTML (so LLM can edit it)
  const secondBody = seenBodies[1] ?? '';
  expect(secondBody).toContain('previousMockupHtml');
  expect(secondBody).toContain('version 1');
  expect(secondBody).toContain('더 미니멀하게');
});

test('back to options resets preview state', async ({ page, seededApp }) => {
  await page.route('**/api/refine/chat', (route) =>
    route.fulfill({
      json: {
        phase: 'options',
        assistantMessage: '추천드릴게요.',
        recommendedPatterns: ['grid', 'card', 'list'],
        summary: '뭐든',
      },
    }),
  );
  await page.route('**/api/refine/preview', (route) =>
    route.fulfill({
      json: {
        mockupHtml: '<div class="p-4">stub</div>',
        planMarkdown: '### stub\n- f.tsx',
      },
    }),
  );

  await page.goto(`/apps/${seededApp.id}/refine`);
  await page.getByLabel('message').fill('뭐든 만들고 싶어요');
  await page.getByTestId('refine-send').click();
  await page.getByTestId('refine-option-grid').click();

  await expect(page.getByTestId('refine-preview')).toBeVisible();

  // Back to options
  await page.getByRole('button', { name: '패턴 다시 고르기' }).click();
  await expect(page.getByTestId('refine-options')).toBeVisible();
  await expect(page.getByTestId('refine-preview')).not.toBeVisible();
});
