import { expect, test } from './fixtures/auth';

// #111 — GitHub issue emission. We mock both /api/refine/* endpoints to keep
// the test deterministic (no Claude API, no real GitHub API call). Real
// GitHub mint happens on Vercel preview where APPEE_GITHUB_TOKEN +
// APPEE_CODEGEN_REPO env vars are set.

test('approved phase → start codegen → issue link shown', async ({ page, seededApp }) => {
  // Mock chat → emit options on first user message
  await page.route('**/api/refine/chat', (route) =>
    route.fulfill({
      json: {
        phase: 'options',
        assistantMessage: '추천드릴게요.',
        recommendedPatterns: ['grid', 'card', 'fullscreen'],
        summary: '친구들 사진 한눈에 보는 갤러리',
      },
    }),
  );

  // Mock preview → fixed mockup + plan
  await page.route('**/api/refine/preview', (route) =>
    route.fulfill({
      json: {
        mockupHtml: '<div class="grid grid-cols-2 gap-2 p-4"><div></div></div>',
        planMarkdown:
          '### 화면 한 줄 요약\n친구들 사진 갤러리.\n\n### 변경/추가 파일\n- gallery.tsx',
      },
    }),
  );

  // Capture the emit request so we can assert on its payload
  const emitBodies: Record<string, unknown>[] = [];
  await page.route('**/api/refine/emit', (route) => {
    emitBodies.push(JSON.parse(route.request().postData() ?? '{}'));
    route.fulfill({
      json: { issueNumber: 142, issueUrl: 'https://github.com/foo/bar/issues/142' },
    });
  });

  await page.goto(`/apps/${seededApp.id}/refine`);
  await page.getByLabel('message').fill('사진 갤러리 만들고 싶어요');
  await page.getByTestId('refine-send').click();
  await page.getByTestId('refine-option-grid').click();
  await expect(page.getByTestId('refine-preview')).toBeVisible();
  await page.getByTestId('refine-preview-approve').click();

  // Approved phase: button is enabled now
  const startBtn = page.getByTestId('refine-emit-start');
  await expect(startBtn).toBeEnabled();
  await startBtn.click();

  // Emitted state shows the link
  await expect(page.getByTestId('refine-emitted')).toBeVisible();
  const link = page.getByTestId('refine-emitted-link');
  await expect(link).toHaveText('#142');
  await expect(link).toHaveAttribute('href', 'https://github.com/foo/bar/issues/142');

  // Payload carried the pattern + summary + recommendations + mockup/plan
  expect(emitBodies.length).toBe(1);
  const body = emitBodies[0] ?? {};
  expect(body.appId).toBe(seededApp.id);
  expect(body.pickedPattern).toBe('grid');
  expect(body.summary).toContain('갤러리');
  expect(body.recommendedPatterns).toEqual(['grid', 'card', 'fullscreen']);
  expect(typeof body.mockupHtml).toBe('string');
  expect(typeof body.planMarkdown).toBe('string');
});

test('emit failure surfaces a user-friendly error and lets the user retry', async ({
  page,
  seededApp,
}) => {
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

  await page.route('**/api/refine/preview', (route) =>
    route.fulfill({
      json: {
        mockupHtml: '<div>m</div>',
        planMarkdown: '### plan',
      },
    }),
  );

  let emitCallCount = 0;
  await page.route('**/api/refine/emit', (route) => {
    emitCallCount++;
    if (emitCallCount === 1) {
      route.fulfill({
        status: 502,
        json: { error: 'github_auth_failed' },
      });
    } else {
      route.fulfill({
        json: { issueNumber: 200, issueUrl: 'https://github.com/foo/bar/issues/200' },
      });
    }
  });

  await page.goto(`/apps/${seededApp.id}/refine`);
  await page.getByLabel('message').fill('가계부 만들고 싶어요');
  await page.getByTestId('refine-send').click();
  await page.getByTestId('refine-option-list').click();
  await expect(page.getByTestId('refine-preview')).toBeVisible();
  await page.getByTestId('refine-preview-approve').click();

  // First click → fails with GitHub auth error
  await page.getByTestId('refine-emit-start').click();
  await expect(page.getByTestId('refine-error')).toContainText('GitHub');
  // Button is back to enabled so the user can retry
  await expect(page.getByTestId('refine-emit-start')).toBeEnabled();

  // Second click → success
  await page.getByTestId('refine-emit-start').click();
  await expect(page.getByTestId('refine-emitted-link')).toHaveText('#200');
  expect(emitCallCount).toBe(2);
});
