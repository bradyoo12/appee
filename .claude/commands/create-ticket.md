---
description: Create a GitHub ticket in bradyoo12/appee + add to @appee project board (#29) as Ready (top)
argument-hint: <feature/bug description or context>
---

## Mission

Create a GitHub ticket for: $ARGUMENTS

The deliverable of this command is:

1. A new issue in `bradyoo12/appee` with full body (Korean title + body).
2. The issue added to the **@appee project board** ([#29](https://github.com/users/bradyoo12/projects/29/views/1))
   with **Status: Ready**, positioned at the **top of the column**.
3. Labels attached as appropriate (`slice:N` + `area:*` + `bug`/`enhancement` 등).

## Language Rule

**CRITICAL: 이슈의 제목(title)과 본문(body)은 반드시 한국어로 작성한다.** 사용자의 원문 요청이 영어인 경우에도 한국어로 번역해서 작성. 단, 코드 스니펫·파일 경로·기술 용어(Expo, EAS, Supabase, Drizzle, Stripe, Vercel 등)는 원문 그대로.

> 영어 유지 영역: 코드 + 코드 주석, commit message, PR description, `docs/` 기술 문서. 이슈 본문은 사용자 시야 영역이라 한국어를 default로 둔다.

## Step 1: Gather Context

다음을 병렬로 읽고 컨텍스트를 잡는다:

- [.claude/plans/00-project-kickoff.md](.claude/plans/00-project-kickoff.md) — 마스터 플랜 (Slice 로드맵, 엔지니어링 결정, 마일스톤)
- [demo/index.html](demo/index.html) — 사용자 워크플로우의 single source of truth (메모리 `feedback_demo_compliance.md`)
- [docs/methodology/top-down.md](docs/methodology/top-down.md) — 5-layer 개발 원칙 (있으면)
- [docs/methodology/demo-compliance.md](docs/methodology/demo-compliance.md) — demo 위배 금지 (있으면)
- [docs/decisions/](docs/decisions/) — ADR 인덱스 (특히 0004 EAS 함정, 0005 단일 EAS project, 0006 Vercel+REST)

이후 `apps/console/`, `templates/expo-base/` 등에서 요청이 건드릴 영역을 grep하여 구체적 파일 경로를 도출 — 이슈의 "구현 가이드" 섹션에 그대로 들어간다.

## Step 2: Duplicate Detection

새 이슈를 만들기 전에 같은 주제의 open issue가 있는지 확인:

```bash
gh issue list --repo bradyoo12/appee --limit 30 --state open \
  --search "in:title <key-terms>" --json number,title,url,state
```

**중복 처리**:
- 제목 유사도 80% 이상이면 → 새 이슈 생성 중단. 기존 이슈 URL을 보고하고 Step 7(프로젝트 보드 추가)만 수행.
- 동일 slice의 인접 이슈와 stronglycoupled면 → 본문 의존성 섹션에 `Refs #N` 명시.

## Step 3: Kickoff Plan Compliance (정책 정합성)

티켓 내용을 다음 기준에 비추어 검증한다:

| 출처 | 점검 항목 |
|------|----------|
| [00-project-kickoff.md](.claude/plans/00-project-kickoff.md) — Slice 로드맵 | 티켓이 속한 slice가 현재 진행 중인 slice의 다음 단계 또는 done slice의 follow-up인가? Slice 0 미완료 상태에서 Slice 2+ 작업 큐잉 금지. (메모리 `feedback_top_down_layers.md` — slice 순서 위반 신호) |
| [demo/index.html](demo/index.html) — 사용자 워크플로우 SSOT | 사용자 경험 변경이면 demo를 먼저 갱신하거나, demo가 이미 그렇게 되어 있어야 함. demo와 다른 UX를 코드에 도입 금지. (메모리 `feedback_demo_compliance.md`) |
| 메모리 `feedback_minimal_implementation.md` | 가장 작은 한 조각만 자동선택. 한 티켓이 multiple unrelated concerns를 묶으면 쪼개라. |
| 메모리 `project_workspace_split.md` | React 버전 충돌 영역(`templates/*` workspace 제외, `react@19.1.0` pin)에 손대면 명시. |

Slice 순서 위반이 불가피하면(사용자가 명시적으로 out-of-order 요청한 경우) **중단하고 확인**.

## Step 4: Draft Issue Body (한국어)

다음 섹션을 포함한다.

### 필수 섹션

- **원본 요청**: 사용자의 원래 입력을 verbatim 보존. 첨부 이미지/파일이 있으면 본 섹션 바로 아래에 배치(아래 "첨부 자료" 참조).
- **UI 목업** (UI 트리거 시 필수, 그 외 섹션 자체 생략): Step 4b에서 Playwright로 렌더링한 PNG를 본문 상단(원본 요청 바로 아래)에 인라인.
- **Slice**: 00-project-kickoff.md 기준 slice 번호 또는 `Slice N follow-up` / `cross-slice infra`.
- **문제 정의**: 무엇이 부족/깨졌나, 왜 지금 해결해야 하나. 관련 마스터 플랜 섹션 또는 ADR 링크.
- **범위 (Scope)**: 무엇이 포함 / 무엇이 제외인지 명시적 경계.
- **성공 기준 (자동 검증 가능 형식)**: 각 항목은 다음 3필드를 모두 포함:
  - **검증 명령** (run): 그대로 실행 가능한 한 줄. 예:
    - `pnpm --filter @appee/console build`
    - `pnpm --filter @appee/console drizzle-kit generate`
    - `curl -sf http://localhost:3000/api/<endpoint>`
    - `pnpm playwright test <spec>`
    - `eas build --platform android --profile preview --non-interactive`
  - **통과 기준** (expect): "exit code 0", "stdout에 `<문자열>` 포함", "HTTP 200 + JSON에 `<field>` 포함", "Playwright PASS" 등.
  - **검증 대상** (what): 어떤 동작/입력/출력을 측정하는지 한 줄 요약.

  > **BAD**: "로그인이 정상 동작해야 한다" — 검증 명령도 통과 기준도 없음.
  > **GOOD**:
  > - 검증 명령: `pnpm playwright test e2e/auth/login.spec.ts`
  > - 통과 기준: 모든 테스트 PASS (exit code 0)
  > - 검증 대상: 매직링크 클릭 → /dashboard 도달 + 세션 쿠키 set

- **구현 가이드**: 방향성 제시 (과도하게 구체적이지 않게). Step 1의 grep 결과로 찾은 **구체적 파일 경로** 사용 — "the auth route"가 아니라 [`apps/console/src/app/auth/callback/route.ts`](apps/console/src/app/auth/callback/route.ts).
- **경계값 단위 테스트**: 추가해야 할 boundary 테스트 목록.
  - 변경 대상 로직의 경계 조건 (빈 입력, 최대/최소, 임계값 전후)
  - 이번 버그/변경이 발생한 직접 시나리오 재현
  - 각 테스트에 **테스트명 / 검증 내용 / 왜 필요한지**(어떤 버그를 방지) 명시
- **E2E / 실통합 테스트** (해당 시 — 아래 트리거 중 *하나라도* 걸리면 필수):
  - **트리거 1 — Supabase/외부 SDK 의존 핵심 경로**: Supabase Auth/Storage/Postgres 직접 호출, Stripe checkout/webhook, Claude API, EAS REST가 핵심 데이터 경로면 mock 테스트는 "우리 코드가 안 깨졌다"만 검증하지 *사용자가 요청한 시나리오가 실제로 작동한다*는 증거가 아님.
  - **트리거 2 — UI 흐름 변경**: 메모리 `feedback_ui_verify_playwright.md` — UI 수정 후 사용자에게 스샷 묻지 말고 Playwright로 직접 검증.
  - **트리거 3 — 사용자가 demo prompt를 제시**: 원본 요청에 구체적 사용자 시나리오 명시되면 그 흐름을 Playwright로 재현하는 테스트가 *정의상* 성공 기준.

  필수 항목:

  | # | 항목 | 형식 |
  |---|------|------|
  | E1 | **Playwright e2e** | `apps/console/e2e/<slug>.spec.ts` 신규/추가. 로컬 Next.js dev server 또는 Vercel preview URL 대상 |
  | E2 | **외부 의존 env-gated** | Stripe webhook / EAS Build / Claude API 등 비용·rate-limit 있는 호출은 env flag로 gate, CI 기본 skip |
  | E3 | **풀 시나리오 검증** | 사용자의 demo prompt를 그대로 실행해서 기대 응답이 나오는지 확인 |
  | E4 | **수동 smoke 체크리스트** | PR description에 들어갈 `pnpm dev` → 브라우저 클릭 → 폰 QR 스캔 단계별 명령. 자동 채점 아님, 리뷰어 직접 실행용 |

  각 E1~E4 항목도 **검증 명령 / 통과 기준 / 검증 대상** 3필드 형식.

  > **트리거 안 걸리면 생략 가능**: 순수 docs 변경, 라벨 텍스트 변경, 내부 헬퍼 리팩토링 등은 E2E 섹션 비워둬도 됨. 단 *생략 사유*는 "범위 외" 섹션에 한 줄 명시.

- **최종 E2E 검증** (모든 티켓 필수 — pytest와 별개의 "사용자가 실제로 경험하는 시점" 검증):

  필수 4필드:

  - **검증 위치** (location): `local` 또는 `vercel-preview` 중 하나.
    - `local` → 머지 후 `pnpm dev` 띄운 `http://localhost:3000` 대상 실행.
    - `vercel-preview` → 머지 후 Vercel preview deploy 완료를 기다린 뒤 그 URL 대상 실행.
  - **검증 명령** (run): 그대로 실행 가능한 한 줄. `BASE_URL` 같은 변수만 채워준다고 가정.
    - `curl -sf "$BASE_URL/api/health"`
    - `pnpm playwright test --config=apps/console/playwright.config.ts e2e/<slug>.spec.ts`
  - **통과 기준** (expect): "exit code 0", "HTTP 200 + JSON `.field`가 `<값>`", "Playwright PASS" 등 측정 가능한 형태.
  - **검증 대상** (what): 어떤 사용자 시나리오/엔드포인트/UX를 확인하는지 한 줄.

  분류 규칙:

  | 위치 | 적용 시점 |
  |------|-----------|
  | `local` | API 라우트, DB 마이그레이션, Drizzle 스키마, 서버 로직, CLI 스크립트. 로컬 Next.js로 검증 가능한 영역 |
  | `vercel-preview` | RSC 동작, edge function, Vercel-only 환경변수, OAuth callback (이메일 magic link, Google), Stripe webhook, CDN 캐시 — 로컬로 흉내낼 수 없는 모든 것 |

  애매하면 **`local`을 default로 둔다** — preview 검증은 deploy 대기(~2min)가 비용이고, 인프라 이슈가 코드 무관하게 retry를 트리거할 수 있어서 신중하게.

  > **포맷 (형식 엄수)**:
  > ```
  > ## 최종 E2E 검증
  >
  > - **검증 위치**: `local`
  > - **검증 명령**: `curl -sf "$BASE_URL/api/health"`
  > - **통과 기준**: HTTP 200 + 본문 `ok`
  > - **검증 대상**: /api/health 엔드포인트가 머지된 main 코드로 살아있음
  > ```

  > **순수 docs 변경 / 외부 영향이 0인 리팩토링**은 본문에 다음 한 줄만:
  > ```
  > ## 최종 E2E 검증
  >
  > 생략 — 사유: 코드 무변경 (docs only) / 런타임 동작 영향 없음
  > ```

- **범위 외**: 명시적으로 제외할 것들 (관련은 있지만 별 이슈로 다룰 항목).
- **의존성**: 차단/관련 이슈. `Refs #N` / `Blocks #N` / `Blocked by #N`.

### 버그 티켓 추가 섹션

- **재현 절차**: 로컬에서 어떻게 재현하는지 단계별. `pnpm install` → `pnpm dev` → 구체적 URL/curl/CLI 호출.
- **실패 출력**: 에러 메시지/스택트레이스 verbatim.
- **FTF 베이스라인**: bug ticket은 **main에서 FAIL하는 Playwright/단위 테스트**를 함께 첨부.
  - `apps/console/e2e/regression-<issue>.spec.ts` 또는 기존 테스트에 추가.
  - main에서 실행 → FAIL 출력을 verbatim 첨부.
  - 통과 기준: 수정 전 RED → 수정 후 GREEN.

### 첨부 자료 섹션 (이미지/파일이 있는 경우)

사용자가 스크린샷/로그 파일을 제공한 경우:

- **이미지** (`.png`, `.jpg`): `.github/issue-assets/<timestamp>-<name>.png` 경로에 Contents API로 업로드 후 `![alt](https://github.com/bradyoo12/appee/blob/main/.github/issue-assets/<filename>?raw=true)` 형식으로 본문 인라인. **`raw.githubusercontent.com` 직링크는 private repo에서 404 — blob URL + `?raw=true` 사용.**

  ```bash
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  FILENAME="${TIMESTAMP}-<descriptive>.png"

  python3 -c "
  import json, base64, os
  with open('<local-path>', 'rb') as f:
      b64 = base64.b64encode(f.read()).decode()
  payload = {'message': 'Add issue asset: $FILENAME', 'content': b64}
  with open(os.environ.get('TEMP', '/tmp') + '/asset-upload.json', 'w') as f:
      json.dump(payload, f)
  "

  gh api --method PUT "repos/bradyoo12/appee/contents/.github/issue-assets/$FILENAME" \
    --input "$TEMP/asset-upload.json" --jq '.content.download_url'
  ```

- **텍스트/코드 파일**: 본문에 fenced code block으로 인라인.

## Step 4b: UI 목업 생성 (UI 트리거 시)

티켓이 시각적 변경을 동반하면 **PNG 목업을 생성해 본문 상단에 인라인**한다. 메모리 `feedback_ui_verify_playwright.md` — UI는 Playwright로 직접 확인.

### 트리거 (셋 중 하나라도 충족하면 필수)

1. Step 1의 grep 결과 **구현 가이드에 등장하는 파일 경로가 [`apps/console/`](apps/console/) 또는 [`templates/expo-base/`](templates/expo-base/) 아래**
2. **원본 요청에 UI 키워드** 포함: `페이지`, `화면`, `대시보드`, `dashboard`, `사이드바`, `버튼`, `폼`, `시각화`, `UI`, `UX`, `layout`, `view`, `목업`, `mockup`, `screenshot`, `mock`
3. **사용자가 직접 mockup/스케치 이미지를 제시** — 그 이미지를 그대로 첨부하되, 추가로 "구현 후 상태" 목업도 생성해 비교

위 셋 모두 거짓이면 (순수 backend / CLI / docs 변경) skip — 본문 섹션 자체를 생략한다.

### 절차

**1. HTML mockup 작성** — `.tmp/mockup-<slug>.html`

```html
<!doctype html>
<html lang="ko" class="bg-white">
  <head>
    <meta charset="utf-8" />
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>body { font-family: 'Noto Sans KR', system-ui, sans-serif; }</style>
  </head>
  <body class="p-8">
    <!-- proposed UI here, using class set from apps/console/src/**/*.tsx -->
  </body>
</html>
```

작성 규칙:
- **기존 컴포넌트와 일관**: `apps/console/src/`의 Tailwind class set + shadcn/ui 패턴 그대로. 새 색상/spacing 발명 금지.
- **그럴듯한 dummy 데이터**: "Lorem ipsum" 금지. 실제 데이터 모양 (`내 첫 앱 — 2026-05-22 빌드 통과 · v0.1.0`) 5~10건. 사용자가 한눈에 "내 데이터가 이렇게 보이겠구나" 판단 가능해야 함.
- **before/after 비교**는 좌우 2-column 한 HTML에 함께 배치 (`grid grid-cols-2 gap-8`).
- **demo/index.html 참고**: 사용자 워크플로우 SSOT이므로 그 디자인 언어 따르기.

**2. 스크린샷 캡처 (Playwright)**

```bash
# minimal one-shot — node_modules가 이미 있으면 그대로 사용
SLUG=<short-kebab-from-title>
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file://' + require('path').resolve('.tmp/mockup-${SLUG}.html'));
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '.tmp/mockup-${SLUG}.png', fullPage: true });
  await browser.close();
})();
"
```

viewport 가이드:
- Console (desktop): `1280x800`
- 모바일 우선 (Expo 산출물 미리보기): `390x844`
- 좌우 비교(before/after): `1600x900`

**3. PNG 업로드 + 본문 인라인** — 기존 첨부 자료 섹션 패턴 재사용:

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILENAME="${TIMESTAMP}-mockup-${SLUG}.png"

python3 -c "
import json, base64, os
with open('.tmp/mockup-${SLUG}.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()
payload = {'message': 'Add mockup asset: $FILENAME', 'content': b64}
with open(os.environ.get('TEMP', '/tmp') + '/asset-upload.json', 'w') as f:
    json.dump(payload, f)
"

gh api --method PUT "repos/bradyoo12/appee/contents/.github/issue-assets/$FILENAME" \
  --input "$TEMP/asset-upload.json" --jq '.content.download_url'
```

**4. 본문에 `## UI 목업` 섹션 추가** — "원본 요청" 바로 아래:

```md
## UI 목업

![제안 UI](https://github.com/bradyoo12/appee/blob/main/.github/issue-assets/<FILENAME>?raw=true)

- 위 이미지는 구현 후 상태 제안. 실제 구현에서 세부 차이는 허용 (간격·라벨 카피 등).
- 데이터 라벨/카운트는 plausible dummy — 실제 사용자 데이터 아님.
```

### 안티 패턴

- **production [apps/console](apps/console) 서버를 캡처**: dev server는 작동 중이지 않을 수 있고, 변경 전 상태만 잡힘. mockup은 *제안 상태*를 보여줘야 함 — 정적 HTML이 정답.
- **이미지 호스팅에 외부 서비스 (imgur 등)**: private repo 정책과 불일치. 반드시 `.github/issue-assets/`.
- **3장 이상의 mockup**: 한 ticket에 1~2장 한도. 더 필요하면 ticket이 너무 큰 신호 — 쪼개라.

## Step 5: Pre-creation Checklist (이슈 생성 전 검증)

다음을 모두 만족해야 Step 6 진행:

| 체크 | 조건 | 항목 |
|------|------|------|
| ☐ | 항상 | 원본 요청 / Slice / 문제 정의 / 범위 / 성공 기준 / 구현 가이드 / 경계값 단위 테스트 / 범위 외 / 의존성 섹션이 모두 존재 |
| ☐ | 항상 | 성공 기준의 모든 항목이 `검증 명령` + `통과 기준` + `검증 대상` 3필드 형식 |
| ☐ | 항상 | 구현 가이드에 **구체적 파일 경로** 포함 (`apps/console/...ts` 또는 `templates/expo-base/...tsx` 형태) |
| ☐ | 항상 | Slice 순서가 00-project-kickoff.md와 정합 — 위반 시 명시적 사유 본문에 포함 |
| ☐ | E2E 트리거 (Supabase/외부 SDK 핵심 경로 / UI 흐름 변경 / 사용자 demo prompt 중 ≥1) | E1~E4 4개 항목 본문에 포함. 트리거 0건이면 "범위 외"에 사유 한 줄 명시 |
| ☐ | 항상 | `## 최종 E2E 검증` 섹션 존재. `검증 위치` (`local` \| `vercel-preview`) + `검증 명령` + `통과 기준` + `검증 대상` 4필드 형식, 또는 `생략 — 사유: ...` 한 줄 |
| ☐ | `검증 위치: vercel-preview` 선택 시 | 사유가 명백한지 재확인 (RSC · edge function · OAuth callback · Stripe webhook · CDN 중 1개 이상). 백엔드 로직만이면 → `local`로 변경 |
| ☐ | DB 스키마 변경 시 | `apps/console/src/db/schema/`에 추가될 파일과 `drizzle-kit generate` 마이그레이션 슬롯 명시 |
| ☐ | 버그 티켓 | 재현 절차 + 실패 출력 verbatim + FTF 베이스라인 (main RED 출력 첨부) |
| ☐ | 사용자 첨부 시 | 이미지가 `.github/issue-assets/`에 업로드되고 본문에 blob URL + `?raw=true`로 인라인 |
| ☐ | UI 트리거 (apps/console · templates/expo-base 경로 OR UI 키워드 OR 사용자 mockup) 충족 시 | `## UI 목업` 섹션이 본문 상단에 존재 + Playwright PNG가 `.github/issue-assets/<TIMESTAMP>-mockup-<slug>.png` 경로로 업로드 + blob URL + `?raw=true`로 인라인 |
| ☐ | demo 위배 검사 | 사용자 워크플로우 변경이면 [demo/index.html](demo/index.html)과 일관성 확인. demo와 다르면 demo 먼저 갱신하거나 별 이슈 생성 |
| ☐ | 중복 검사 | Step 2에서 open issues 확인 완료 |

미충족 항목이 있으면 Step 4로 돌아가 보완.

## Step 6: Create GitHub Issue

```bash
# bradyoo12 계정 활성화 보장
CURRENT=$(gh auth status 2>&1 | grep -oP 'account \K\S+' | head -1)
if [ "$CURRENT" != "bradyoo12" ]; then
  gh auth switch --user bradyoo12 || { echo "ERROR: bradyoo12 로그인 필요"; exit 1; }
fi

# 본문은 draft 파일에서 읽기 (쉘 인자 길이 회피)
BODY=$(cat <draft-file>)
ISSUE_URL=$(gh api --method POST "repos/bradyoo12/appee/issues" \
  -f title="<한국어 제목>" \
  -f body="$BODY" \
  --jq '.html_url')

ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP '/issues/\K\d+')
echo "Created: $ISSUE_URL (#$ISSUE_NUM)"
```

**에러 처리**: 실패 시 즉시 재시도하지 말고 같은 제목의 이슈가 이미 생성됐는지 검색 후 결정.

## Step 7: Add to @appee Project Board (#29) + Status Ready (top)

`@appee` 프로젝트 (https://github.com/users/bradyoo12/projects/29) ID 메타데이터:

- **Project ID**: `PVT_kwHNf9fOAV0K4A`
- **Status field ID**: `PVTSSF_lAHNf9fOAV0K4M4Unryo`
- **Status options**: Backlog=`f75ad846` / Ready=`61e4505c` / In progress=`47fc9ee4` / In review=`df73e18b` / Done=`98236657`

```bash
# Fallback 계정 (project access 보유)
ACCOUNTS=("bradyoo12" "byooxbert" "yoohoony-gmail-com")

for ACCT in "${ACCOUNTS[@]}"; do
  CURRENT=$(gh auth status 2>&1 | grep -oP 'account \K\S+' | head -1)
  if [ "$CURRENT" != "$ACCT" ]; then
    gh auth switch --user "$ACCT" 2>/dev/null || continue
  fi

  # GraphQL rate limit 사전 점검
  REMAINING=$(gh api graphql -f query='{ rateLimit { remaining } }' --jq '.data.rateLimit.remaining' 2>/dev/null || echo "0")
  if [ "$REMAINING" -lt 10 ]; then
    echo "Skip $ACCT (rate limit: $REMAINING)"
    continue
  fi

  # 1) 이슈를 프로젝트에 추가, item ID 캡처
  ITEM_ID=$(gh project item-add 29 --owner bradyoo12 --url "$ISSUE_URL" --format json --jq '.id') || continue

  # 2) Status → Ready
  gh project item-edit \
    --project-id PVT_kwHNf9fOAV0K4A \
    --id "$ITEM_ID" \
    --field-id PVTSSF_lAHNf9fOAV0K4M4Unryo \
    --single-select-option-id 61e4505c

  # 3) Ready 컬럼 최상단 이동 (afterId 없이 = 첫 위치)
  gh api graphql -f query='
  mutation {
    updateProjectV2ItemPosition(
      input: {
        projectId: "PVT_kwHNf9fOAV0K4A"
        itemId: "'"$ITEM_ID"'"
      }
    ) {
      clientMutationId
    }
  }'

  # 4) fallback 계정 사용했으면 bradyoo12로 복귀
  if [ "$ACCT" != "bradyoo12" ]; then
    gh auth switch --user bradyoo12 2>/dev/null || true
  fi
  break
done
```

## Step 8: Add Labels

appee 레포 기존 라벨을 그대로 사용. **최소 3종(slice + area + type)** 부착 권장:

```bash
# Slice 라벨 (slice:0 ~ slice:8 중 정확히 하나)
gh api --method POST \
  "repos/bradyoo12/appee/issues/${ISSUE_NUM}/labels" -f "labels[]=slice:0"

# Area 라벨 (auth/console/payment/builder/eas/db/design/infra/ai/template 중 ≥1)
gh api --method POST \
  "repos/bradyoo12/appee/issues/${ISSUE_NUM}/labels" -f "labels[]=area:auth"

# Type 라벨
# 버그 → bug, 신규 기능 → enhancement, 문서 → documentation
[ "<is-bug>" = "yes" ] && gh api --method POST \
  "repos/bradyoo12/appee/issues/${ISSUE_NUM}/labels" -f "labels[]=bug"
[ "<is-feature>" = "yes" ] && gh api --method POST \
  "repos/bradyoo12/appee/issues/${ISSUE_NUM}/labels" -f "labels[]=enhancement"
[ "<is-docs>" = "yes" ] && gh api --method POST \
  "repos/bradyoo12/appee/issues/${ISSUE_NUM}/labels" -f "labels[]=documentation"

# 우선순위 (slice의 must-have면)
[ "<is-p0>" = "yes" ] && gh api --method POST \
  "repos/bradyoo12/appee/issues/${ISSUE_NUM}/labels" -f "labels[]=priority:p0"

# Epic (multiple sub-tickets 거느린 상위 이슈)
[ "<is-epic>" = "yes" ] && gh api --method POST \
  "repos/bradyoo12/appee/issues/${ISSUE_NUM}/labels" -f "labels[]=type:epic"
```

필요한 라벨이 없으면 생성 후 부착:

```bash
gh api "repos/bradyoo12/appee/labels/on%20hold" --silent 2>/dev/null \
  || gh api --method POST "repos/bradyoo12/appee/labels" \
       -f name="on hold" -f color="fbca04" \
       -f description="자동 조사 한도 도달 — 사람 개입 필요" --silent
```

## Step 9: Report

다음을 한 번에 출력:

- Issue URL: `https://github.com/bradyoo12/appee/issues/<NUM>`
- 프로젝트 보드: Ready 컬럼 최상단 배치 확인
- 라벨: `<부착된 라벨 목록>`
- 다음 액션 안내: 구현은 직접 시작하거나, 별도 implementation 명령(있다면)으로 위임.

## 이 명령이 하지 않는 것

- 로컬 ticket 파일을 만들지 않는다 (GitHub Issue가 single source of truth).
- PR 생성/푸시 (별 작업).
- Slice 순서 위반을 silent로 진행하지 않는다 — 위반 가능성 발견 시 명시적 확인.
- [demo/index.html](demo/index.html)을 자동 갱신하지 않는다 — 사용자 워크플로우 변경은 데모 먼저 사용자와 합의.

## Important Notes

- 모든 이슈는 `bradyoo12/appee`로 생성.
- 신규 이슈는 자동으로 Ready 컬럼 **최상단**에 위치.
- **CRITICAL — Private repo에서 `raw.githubusercontent.com`은 404.** 이미지는 반드시 `https://github.com/bradyoo12/appee/blob/main/.github/issue-assets/<filename>?raw=true` 형식.
- 이미지 base64 업로드는 Python + JSON 파일 경유 — `-f content="$BASE64"`는 쉘 인자 길이 초과 위험.
- 이슈 생성 실패 시 같은 제목으로 검색 후 결정 — 무한 재시도 금지.
- `gh auth switch` fallback 순서: `bradyoo12` → `byooxbert` → `yoohoony-gmail-com`.
- 메모리 참조: `feedback_walking_skeleton.md` (역순 8→1) / `feedback_focus_separation.md` (개발 vs 사용자 레이어) / `feedback_minimal_implementation.md` (가장 작은 한 조각) / `feedback_demo_compliance.md` (demo SSOT) / `feedback_ui_verify_playwright.md` (UI는 Playwright).
