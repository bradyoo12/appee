# appee — Project Kickoff Plan (Top-Down)

> 본 문서는 **appee를 만드는 작업** 레이어의 마스터 플랜이다.
> "appee 사용자가 따라갈 워크플로우"는 별도 레이어이며 본 문서에서는 **제품 요구사항**으로만 인용한다.
> (메모리: `feedback_focus_separation.md`)
>
> 작성일: 2026-05-08 · 의사결정자: Claude (사용자 위임 — "모든 결정 recommend대로")

---

## 0. North Star

> **"가입 후 5분 안에 누구나 자기 폰에서 자기만의 앱을 실행할 수 있고, 사용할수록 그 앱이 점점 더 나에게 맞춰진다."**

이 한 줄이 모든 우선순위 분쟁의 tie-breaker다. 두 개의 핵심 동사:
- **Ship-first** — 시작 시점부터 폰에 진짜 앱이 깔려 있다.
- **Personalize-always** — 매 상호작용이 컨텍스트를 더 모으고 앱에 반영된다.

---

## 1. 경쟁사 지형 & appee의 차별화

### 1.1 경쟁사 클러스터

| 클러스터 | 대표 | 핵심 흐름 | 약점 |
|---|---|---|---|
| **AI text-to-mobile** | a0.dev, Rork | "describe your app" → 코드 생성 → 미리보기 | 폰 설치 경험은 부수적, 컨텍스트 수집 빈약, 빌드 후 출시는 사용자 몫 |
| **AI text-to-web (모바일 확장)** | Lovable, Bolt.new, v0 | 웹 → 모바일 어댑터 | 진짜 RN/네이티브 아님, 스토어 출시 어려움 |
| **AI 멀티플랫폼 에이전트** | Replit Agent, Cursor mobile | 범용 코드 생성 | 모바일 운영화(EAS, 스토어, IAP) 비특화 |
| **No-code visual builders** | FlutterFlow, Adalo, Glide, Appy Pie, Thunkable | 드래그앤드롭 | AI 비중 낮음, 개인화 약함, 학습곡선 |
| **Native sandbox** | Expo Snack | 코드 → QR 미리보기 | 사용자 지향 아닌 개발자 도구 |

### 1.2 appee의 차별화 4축 (이게 우리의 전략 기둥)

| # | 기둥 | 경쟁사가 안 하는 이유 | appee의 결정 |
|---|---|---|---|
| **P1** | **Reverse-flow UX** — 가입 즉시 Hello World 앱이 폰에 설치, 거기서부터 거꾸로 채움 | 빌드 코스트/시간이 비싸서 "확정 후 빌드" 모델로 도망감 | EAS Build를 첫 5분에 무조건 1회 호출. 캐싱·증분 빌드로 비용 흡수. |
| **P2** | **Context Engine** — 취향/목적/배경/사용 패턴을 지속 수집해 모든 생성에 반영 | 단발 프롬프트 모델이라 메모리 인프라가 없음 | 가입 시 인터뷰 + 사용 텔레메트리를 동일 컨텍스트 스토어로 합침. 모든 LLM 호출에 prompt caching으로 주입. |
| **P3** | **Real Ops from Day 1** — Auth/결제/빌드/스토어가 첫 슬라이스부터 진짜로 작동 | "AI 데모"에 집중하느라 운영화 미루다 후반에 폭발 | Slice 0가 운영화 5대 통합점을 한 번에 통과 (메모리 `project_slice_0.md`). |
| **P4** | **Always-shippable architecture** — 매 편집마다 폰 앱이 즉시 갱신, "출시 전 마지막 단계" 없음 | 미리보기는 있지만 스토어 빌드와 분리되어 있음 | EAS Update(JS 핫 갱신) + 변경 감지 시 EAS Build 자동 재호출. 사용자에겐 "설치된 앱이 항상 최신". |

### 1.3 우리가 의도적으로 안 하는 것
- **빈 캔버스 / 위저드 다단계 폼** — P1 위반.
- **웹뷰 래핑 가짜 모바일** — P3·P4 위반.
- **buildee 코드 재사용 / SSO** — 메모리 `project_buildee_relation.md` 위반.
- **한국 한정 결제 (토스페이먼츠 등)** — 글로벌 타겟 (메모리 `project_tech_stack.md`).
- **Slice 0에 AI 추가** — 메모리 `project_slice_0.md` 위반.

---

## 2. 제품 요구사항 (사용자 워크플로우 레이어 — 인용만)

> 본 섹션은 **appee 사용자**의 경험을 정의하며, 본 문서의 "구현"은 모두 이 경험을 가능하게 만드는 일이다.

1. 가입 → 2. 결제(트라이얼/구독) → 3. 가입 직후 즉시 EAS Build 호출 → 4. QR로 폰에 Hello World 앱 설치 → 5. 콘솔에서 컨텍스트 인터뷰(취향/목적) → 6. 인터뷰 답이 들어올 때마다 앱이 진화 → 7. 화면/기능/디자인을 **거꾸로** 채움 → 8. 매 편집마다 EAS Update로 폰 앱 갱신 → (이후) 스토어 출시.

8단계는 **시작점**이고, 1~7단계는 **이후**에 채워진다. (메모리 `feedback_walking_skeleton.md`)

---

## 3. 슬라이스 로드맵 (Top-Down)

각 슬라이스는 end-to-end로 동작하며, 다음 슬라이스는 이전 슬라이스 위에 진짜 기능을 얹는다 (스텁 금지).

| Slice | 코드명 | 핵심 추가 | 주요 위험 검증 | 목표 기간 |
|---|---|---|---|---|
| **S0** | *Walking Skeleton* | 가입→결제→한 줄 입력→템플릿 치환→EAS Build→QR→폰 설치→사용량 기록 | 5대 운영화 통합점 | 4주 |
| **S1** | *AI 한 줄 → 화면* | Claude API로 한 줄을 화면 코드로 생성 (템플릿 치환 자리 대체) | 코드 생성 안전성, prompt caching, 빌드 실패 복구 | 2주 |
| **S2** | *Context Collection v1* | 가입 직후 인터뷰(5~10문항), 답을 컨텍스트 스토어에 저장, 모든 LLM 호출에 주입 | 컨텍스트 스키마, 토큰 비용, 개인정보 처리 | 2주 |
| **S3** | *Reverse Fill (8→7→6)* | 콘솔에 "지금 당신 앱"을 보여주고, 그 위에 "다음에 채울 것" 카드(화면, 기능, 디자인 토큰) 제시 | 역순 UX 검증, 변경의 응집성 | 3주 |
| **S4** | *Multi-screen + Navigation + Theming* | Expo Router 기반 다화면, 디자인 토큰 시스템, 컨텍스트 기반 테마 | 코드 생성의 다중 파일 일관성 | 3주 |
| **S5** | *EAS Update 핫 갱신 + 스토어 채널* | JS-only 변경은 빌드 없이 폰에 즉시 반영, 네이티브 변경은 자동 EAS Build | 갱신 채널 분리, 캐시 무효화 | 2주 |
| **S6** | *Usage-driven Regeneration* | 폰 앱의 사용 텔레메트리를 컨텍스트로 흡수, "이 화면 잘 안 쓰시네요, 바꿀까요?" 제안 | 텔레메트리 PII 처리, 제안 노이즈 | 3주 |
| **S7** | *Store Deployment (TestFlight + Play Internal)* | 사용자 자기 앱을 본인 스토어 계정으로 (또는 appee 공용 계정으로) 출시 | Apple/Google 정책, 번들 ID 충돌, 심사 대응 | 4주 |
| **S8** | *Sharing & Collaboration* | 친구 초대, 같은 앱을 다른 폰에 동시 설치 | 멀티 디바이스 컨텍스트 동기화 | 2주 |

> **Slice 0가 본 문서의 핵심 deliverable.** 이후 슬라이스는 sketch이며 S0 검증 후 재계획.

---

## 4. 엔지니어링 결정 (모든 추천 — 사용자 위임)

| 영역 | 결정 | 대안 | 선정 이유 |
|---|---|---|---|
| **레포 구조** | 모노레포 (`pnpm` workspace + `Turborepo`) | 멀티레포 / Nx | 콘솔·산출물 템플릿·공유 타입을 같이 진화시켜야 함. Turborepo는 Vercel과 1급 통합. |
| **언어** | TypeScript everywhere (strict) | — | 메모리 확정 |
| **콘솔 프레임워크** | Next.js 15 App Router + RSC + Server Actions | Remix, SvelteKit | 메모리 확정 + Vercel 1급 |
| **콘솔 UI** | Tailwind CSS + shadcn/ui + Radix | MUI, Chakra | LLM이 가장 잘 생성, 사이즈 작음 |
| **콘솔 상태** | Server-first (RSC + Server Actions) + URL state + minimal client (`zustand`) | Redux, Jotai | RSC 모델과 충돌 최소 |
| **DB 액세스** | `drizzle-orm` + Supabase Postgres (직접 연결, RLS 활용) | Prisma, raw SQL, Supabase JS만 | 마이그레이션 명확, RSC에서 빠름, Supabase JS는 클라이언트(브라우저)에서만 사용 |
| **인증** | Supabase Auth (Email Magic Link + Google + Apple OAuth) + `@supabase/ssr` | Clerk, Auth.js | 메모리 확정 + Apple 로그인은 iOS 스토어 정책 때문에 필수 |
| **결제** | Stripe Checkout + Subscriptions + Customer Portal · 트라이얼 7일 · webhook은 Vercel Edge Function | Paddle, RevenueCat | 메모리 확정 (글로벌). RevenueCat은 IAP 시점에 재검토 |
| **AI** | `@anthropic-ai/sdk` · 기본 모델 `claude-sonnet-4-6` · 복잡 생성은 `claude-opus-4-7` · prompt caching 적극 사용 | OpenAI | 메모리 확정. 컨텍스트 큰 시스템 프롬프트 재사용에 caching이 비용 핵심 |
| **AI 오케스트레이션** | Claude Agent SDK (코드 생성 루프, 파일 수정, 빌드 트리거) | LangChain, 자체 구현 | Anthropic 1급, 도구 호출 모델과 결이 맞음 |
| **산출물 템플릿** | Expo SDK 52 + Expo Router + TypeScript | bare RN | 메모리 확정. EAS Build/Update 1급 |
| **빌드 트리거** | `eas-cli` programmatic + EAS Build webhook | Codemagic, Bitrise | 메모리 확정 |
| **산출물 저장** | Supabase Storage (앱 소스 tarball + 빌드 아티팩트 메타데이터) | S3 | 1 vendor 단순화 |
| **컨텍스트 스토어** | Postgres `user_contexts` 테이블 (JSONB + 정규화 핵심 컬럼) + `context_events` 이벤트 로그 | Vector DB | S0~S2에서는 RAG 불필요. S6 텔레메트리 단계에 pgvector 검토 |
| **관측** | Sentry (콘솔 + 산출물 양쪽) + PostHog (제품 분석) | Datadog | 가격/통합 단순 |
| **로그** | Vercel logs + Supabase logs + Sentry breadcrumbs | — | 추가 인프라 없음 |
| **CI/CD** | GitHub Actions · 콘솔은 Vercel preview · 산출물 템플릿은 EAS Build per-PR (느려서 main만) | CircleCI | 표준 |
| **환경 분리** | `dev` (로컬) / `staging` (Vercel preview + Supabase staging) / `prod` (Vercel prod + Supabase prod) | 단일 환경 | 결제·빌드 같은 진짜 통합점이 있어서 분리 필수 |
| **시크릿** | Vercel Env + GitHub Actions Secrets + 1Password (사람용) | Doppler | 도입 단순 |
| **테스트** | Vitest (유닛) + Playwright (콘솔 E2E) + Detox (산출물 RN E2E, S4부터) | Jest | Vite/Vitest는 RSC와 충돌 적음 |
| **린트/포맷** | Biome (린트+포맷) + TypeScript strict | ESLint+Prettier | 단일 도구, 빠름 |
| **번들/패키징** | pnpm + Turborepo remote cache (Vercel) | npm, yarn | pnpm = 모노레포 최적 |
| **국제화** | `next-intl` (콘솔) + Expo localization (산출물). 첫 출시 언어: 영어, 한국어 | — | 글로벌 타겟 |
| **법무/약관** | Pre-S0에 ToS/Privacy 초안 (Stripe·스토어 심사 요건) | — | 결제 켜는 순간 필요 |

---

## 5. 모노레포 레이아웃 (목표 상태)

```
appee/
├── apps/
│   ├── console/                # Next.js 15 콘솔 (사용자가 자기 앱 만드는 곳)
│   └── marketing/              # (S2 이후) 랜딩
├── packages/
│   ├── db/                     # Drizzle 스키마 + 마이그레이션
│   ├── shared/                 # 공유 타입, zod 스키마
│   ├── ai/                     # Claude 클라이언트, 프롬프트, agent loop
│   ├── builder/                # EAS Build 트리거/모니터, 템플릿 치환 엔진
│   └── context-engine/         # 컨텍스트 수집/주입 (S2부터 본격)
├── templates/
│   └── expo-base/              # 산출물 베이스 템플릿 (Expo + TS + Router)
├── infra/
│   ├── supabase/               # SQL 마이그레이션, RLS 정책, seed
│   └── stripe/                 # Stripe products/prices 코드 정의 (idempotent)
├── .github/workflows/          # CI
├── .claude/                    # 본 플랜, 프롬프트, 스킬 (AI dev 인프라)
├── biome.json
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 6. Slice 0 — 에픽 & 티켓 분해

> Slice 0의 합격 기준 (메모리 `project_slice_0.md`):
> **사람 손 개입 없이** 가입 → 결제 → 한 줄 입력 → 템플릿 치환 → EAS Build → QR → 폰 설치 → 사용량 1회 기록 → 대시보드 표시 완주.

### Epic E0 — Repo & Infra Bootstrap (선행 조건)

| # | 티켓 | 산출물 | 선행 |
|---|---|---|---|
| E0-1 | 모노레포 초기화 (pnpm + Turborepo + Biome + tsconfig base) | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json` | — |
| E0-2 | GitHub repo 보호 규칙 + main 브랜치 PR 필수 + Actions 권한 | `.github/settings.yml` (옵션) | E0-1 |
| E0-3 | `apps/console` Next.js 15 스캐폴드 + RSC + Tailwind + shadcn 초기 | 빈 홈/대시보드 라우트 | E0-1 |
| E0-4 | `packages/shared` (zod 스키마, 타입) + `packages/db` (Drizzle 스키마 빈 골격) | 타입 export | E0-1 |
| E0-5 | Supabase 프로젝트 2개 생성 (staging, prod) + 환경변수 정리 | `.env.example` | — |
| E0-6 | Vercel 프로젝트 연결 (preview/prod) + 환경변수 동기화 | Vercel 프로젝트 | E0-3, E0-5 |
| E0-7 | Sentry + PostHog 프로젝트 생성 + 콘솔 통합 | 에러 1건 캐치 | E0-3 |
| E0-8 | CI: lint + typecheck + test 워크플로우 | `.github/workflows/ci.yml` | E0-1 |
| E0-9 | `templates/expo-base` 스캐폴드 (Expo 52, Router, TS, 단일 화면) + 로컬 `expo start` 동작 | 작동하는 RN 앱 | E0-1 |
| E0-10 | EAS 계정/프로젝트 생성 + `eas.json` (`development`, `preview`, `production` 프로필) | EAS 프로젝트 ID | E0-9 |

### Epic E1 — Auth (Supabase + Next.js)

| # | 티켓 | 합격 기준 |
|---|---|---|
| E1-1 | Supabase Auth 활성화 (Email Magic Link, Google, Apple) + 콜백 URL 설정 | 콘솔에서 OAuth 시작 가능 |
| E1-2 | `@supabase/ssr` 통합 (서버/클라이언트 클라이언트 분리, 미들웨어 세션 갱신) | 서버 컴포넌트에서 `getUser()` 작동 |
| E1-3 | 로그인/회원가입 페이지 (shadcn) + 매직 링크 흐름 | E2E: 새 이메일로 가입 → 대시보드 진입 |
| E1-4 | `users` 프로필 테이블 (Drizzle) + 가입 트리거 (Postgres function) | 신규 가입 시 row 자동 생성 |
| E1-5 | RLS 정책: 사용자는 본인 row만 조회/수정 | 다른 사용자 row 읽기 401 |
| E1-6 | Sign out + 세션 만료 처리 | 만료 후 자동 로그인 페이지로 |

### Epic E2 — Stripe Checkout & Webhook Gating

| # | 티켓 | 합격 기준 |
|---|---|---|
| E2-1 | Stripe 계정 셋업 (테스트 모드) + Product/Price 코드로 정의 (`infra/stripe/`) | 스크립트 실행 시 prices 멱등 생성 |
| E2-2 | `subscriptions` 테이블 (Drizzle) + 상태 머신 (`trialing`, `active`, `past_due`, `canceled`) | 마이그레이션 통과 |
| E2-3 | Checkout 세션 생성 Server Action (가입 직후 자동 시작) | 가입 → Stripe Checkout 페이지 |
| E2-4 | Stripe Webhook 핸들러 (Edge Function, `checkout.session.completed`, `customer.subscription.*`) + 시그니처 검증 | webhook event → DB row update |
| E2-5 | 구독 게이트 미들웨어: `active|trialing` 아니면 `/billing`으로 | 미결제 사용자 빌드 트리거 차단 |
| E2-6 | Customer Portal 링크 | 구독 취소/카드 변경 가능 |
| E2-7 | 결제 완료 후 자동 다음 단계로 라우팅 (`/onboarding/first-app`) | E2E: 카드 입력 → 빌드 트리거 페이지 |

### Epic E3 — One-line Input → Template Substitution

> S0에서는 **AI 없음**. 한 줄 입력을 템플릿 placeholder에 그대로 치환.

| # | 티켓 | 합격 기준 |
|---|---|---|
| E3-1 | 콘솔 페이지 `/onboarding/first-app`: textarea + "내 앱 만들기" 버튼 | UI 작동 |
| E3-2 | `apps` 테이블 (Drizzle) — `id`, `user_id`, `headline`, `status`, `eas_build_id`, `install_url` | 마이그레이션 통과 |
| E3-3 | `packages/builder` 템플릿 치환 엔진: `templates/expo-base`를 tarball로 복사하고 `{{HEADLINE}}` 치환 | 단위 테스트: 입력 → 치환된 파일트리 |
| E3-4 | 산출물 tarball을 Supabase Storage에 업로드 + signed URL 발급 | 업로드/다운로드 작동 |
| E3-5 | Server Action: 입력 받기 → app row 생성 → 치환 → 업로드 → 다음 단계로 | E2E: 한 줄 입력 → DB row + storage object |

### Epic E4 — EAS Build 트리거 & 모니터링

| # | 티켓 | 합격 기준 |
|---|---|---|
| E4-1 | EAS API 토큰 발급 + Vercel 시크릿 등록 | curl로 인증 성공 |
| E4-2 | `packages/builder/eas.ts`: tarball signed URL을 받는 EAS Build 호출 (`eas build --non-interactive --platform ios --profile preview`의 프로그래매틱 등가) | 작은 테스트 빌드 성공 |
| E4-3 | iOS 시뮬레이터 빌드 vs 실기기 빌드 결정 — **실기기 빌드 (`internal distribution`)** 채택. 사용자 디바이스 UDID는 S0에서는 Apple TestFlight 우회 위해 Android 우선, iOS는 S5에서 처리 | 결정 문서화 |
| E4-4 | **S0 실기기 타겟 = Android `apk` (`profile: preview`)** — iOS는 시뮬레이터/로컬 빌드만 시연용 | 결정 문서화 (`docs/decisions/0001-android-first-s0.md`) |
| E4-5 | EAS Build webhook 등록 (빌드 완료/실패) + 핸들러 (status 업데이트) | webhook event → app.status 갱신 |
| E4-6 | 빌드 진행 상태 콘솔에 실시간 표시 (Server-Sent Events 또는 폴링) | 진행 % 또는 단계 표시 |
| E4-7 | 빌드 실패 시 사용자 친화적 에러 + 재시도 버튼 | 임의 실패 → UI 안 깨짐 |
| E4-8 | 결제 게이트 재확인: 빌드 트리거 직전 구독 상태 server-side 재검증 | 우회 시도 (curl) 차단 |

> **결정 (E4-3, E4-4) 근거**: Slice 0의 목적은 운영화 통합점 검증. iOS 실기기 배포는 Apple Developer 계정 + UDID 등록이 필요해 가입~빌드 5분 시나리오를 깨뜨림. **Android APK 직접 설치**가 P1 (5분 안에 폰에 설치)에 가장 직접적. iOS는 S5의 TestFlight 단계에서 진짜로 처리. (사용자 검토 후 변경 가능)

### Epic E5 — QR 전달 & 폰 설치

| # | 티켓 | 합격 기준 |
|---|---|---|
| E5-1 | 빌드 완료 시 콘솔에 QR 표시 (`qrcode` 라이브러리) | QR이 install_url 인코딩 |
| E5-2 | install_url 페이지: Android는 직접 APK 다운로드, iOS는 "S5에서 지원" 안내 | 모바일 브라우저에서 작동 |
| E5-3 | "설치 완료했어요" 버튼 (사용자가 직접 클릭 — S0 단순화) | 클릭 시 `installs` row 생성 |
| E5-4 | 콘솔 대시보드: 내 앱 목록 + 상태 + QR 다시 보기 | 페이지 작동 |

### Epic E6 — 사용량 미터링 & 대시보드

| # | 티켓 | 합격 기준 |
|---|---|---|
| E6-1 | `usage_events` 테이블 (`id`, `user_id`, `app_id`, `kind`, `meta`, `created_at`) + 인덱스 | 마이그레이션 통과 |
| E6-2 | 산출물 RN 앱에 사용량 비콘: 앱 시작 시 콘솔 API에 ping (사용자 토큰은 빌드 시점에 임베드) | 폰에서 앱 실행 시 row 추가 |
| E6-3 | 비콘 API 엔드포인트 (Edge Function) + 토큰 검증 + 레이트 리밋 | 외부 사용 시도 401 |
| E6-4 | 대시보드: 앱 카드 + "총 실행 N회" + 최근 실행 시간 | E2E: 폰에서 1회 실행 → 대시보드 +1 |

### Epic E7 — Slice 0 합격선 검증 (E2E)

| # | 티켓 | 합격 기준 |
|---|---|---|
| E7-1 | Playwright E2E: 가입 → 결제(Stripe test card) → 한 줄 입력 → 빌드 시작 | 자동 통과 |
| E7-2 | 수동 검증 체크리스트: E7-1 끝에서 실제 폰(Android)에 설치 → 앱 실행 → 대시보드 +1 확인 | 사람이 1회 완주 |
| E7-3 | 비용 측정: Slice 0 1회 완주의 EAS Build 비용 + Vercel/Supabase 비용 산출 | `docs/cost/slice-0.md` |
| E7-4 | Slice 0 후기 (어떤 가정이 깨졌는지, S1 변경점) | `docs/retros/slice-0.md` |

---

## 7. 슬라이스 1+ 스케치 (참고만 — S0 후 재계획)

| Slice | 핵심 신규 에픽 |
|---|---|
| S1 | E1.AI: Claude Sonnet 4 코드 생성 루프, 한 줄 → React Native 화면 코드 / E1.Safety: 생성 코드 정적 검증 + 빌드 실패 자동 복구 |
| S2 | E2.Context: 인터뷰 5~10문항 UI / E2.Inject: 모든 LLM 호출에 컨텍스트 자동 주입 + prompt caching |
| S3 | E3.ReverseUI: "지금 당신 앱" 카드 + "다음 채울 것" 추천 / E3.Patch: AI가 부분 화면만 수정 |
| S4 | E4.Multi: Expo Router 다화면 / E4.Theme: 컨텍스트→토큰 매핑 |
| S5 | E5.Update: EAS Update 채널 분리 / E5.iOS: TestFlight 진짜 출시 |
| S6 | E6.Telemetry: 사용 패턴 → 컨텍스트 / E6.Suggest: "이 화면 잘 안 쓰시네요" 제안 |
| S7 | E7.Store: Apple/Google 정책 가이드 + 자동 메타데이터 |
| S8 | E8.Share: 초대/협업 |

---

## 8. 위험 & 미해결 질문

| # | 위험 | 영향 | 완화 |
|---|---|---|---|
| R1 | EAS Build 큐 대기시간이 5분 약속을 깨뜨림 | P1 위반 | 빌드 캐시 + 사용자에 "1~3분 기다리는 동안 인터뷰 시작" UX |
| R2 | Apple 정책: appee가 사용자 자기 앱을 자기 계정으로 출시하게 강제할 가능성 | S7 지연 | S7에서 본격 검토. S0~S5는 Android 우선 |
| R3 | Stripe webhook 신뢰성 (지연/중복) | 결제 게이트 우회 | 멱등성 키 + 빌드 트리거 직전 server-side 재확인 (E4-8) |
| R4 | 산출물 RN 앱에 임베드된 사용자 토큰 유출 | 비콘 위조 | 단기 토큰 + 레이트 리밋 + 폐기 가능 |
| R5 | 컨텍스트 PII (S2 이후) | GDPR/PIPEDA | 콘솔에 "내 컨텍스트 보기/삭제" UI 필수 (S2 동시 출시) |
| R6 | LLM 비용 폭주 (S1 이후) | 단위경제 붕괴 | prompt caching + 사용자별 일일 한도 + 모델 라우팅 (간단=Sonnet, 복잡=Opus) |
| R7 | 빌드/생성 실패의 사용자 신뢰 손상 | 이탈 | 모든 실패 시 명확한 영문/한국어 메시지 + 자동 재시도 + Sentry 자동 보고 |

### 미해결 (S0 시작 전 사용자 결정 권장)
- **D1**: appee 도메인 (예: `appee.dev`, `appee.app`)
- **D2**: Apple Developer 계정 / Google Play Developer 계정 보유 여부 (S5 영향)
- **D3**: 첫 결제 가격 (예: $19/mo, 7일 트라이얼)
- **D4**: 콘솔 첫 출시 언어 — 추천: **English first, Korean fast-follow** (글로벌 타겟이라)

> 사용자가 "모든 결정 recommend대로"라고 했으므로, 위 D1~D4의 추천: `appee.app` / 보유 가정하고 S5에서 확인 / **$19/mo + 7일 트라이얼** / **EN+KO 동시 출시**.

---

## 9. 즉시 시작 가능한 다음 액션 (Pre-Slice-0)

본 플랜 승인 후 가장 먼저 만들 GitHub 이슈 (E0 에픽):

1. `[E0-1] Bootstrap monorepo (pnpm + Turborepo + Biome + tsconfig)`
2. `[E0-3] Scaffold apps/console with Next.js 15 + Tailwind + shadcn`
3. `[E0-9] Scaffold templates/expo-base (Expo 52 + Router + TS)`
4. `[E0-5] Provision Supabase projects (staging, prod)`
5. `[E0-10] Provision EAS account + project + eas.json profiles`

이 5개가 끝나면 E1(Auth)부터 직렬로 진행해 4주 안에 Slice 0 합격선 도달.

---

## 10. 합의된 운영 원칙 (메모리 인용)

- 항상 **appee 만드는 작업** vs **사용자 워크플로우 디자인** 레이어를 분리해서 다룰 것 (`feedback_focus_separation.md`).
- Slice 0에 AI/컨텍스트 수집 끼워넣지 않을 것 (`project_slice_0.md`).
- 운영화 레이어는 **진짜로** 작동시킬 것. 스텁/목업 금지 (`feedback_walking_skeleton.md`).
- buildee 코드/인프라/계정에 의존하지 않을 것 (`project_buildee_relation.md`).

---

## 11. 기술 스택 — 확정판 (모든 라이브러리·버전 선택 완료)

### 11.1 콘솔 (`apps/console`)
| 영역 | 선택 | 비고 |
|---|---|---|
| Runtime | Node.js 20 LTS | Vercel 호환 |
| Framework | **Next.js 15** (App Router, RSC, Server Actions, Turbopack dev) | — |
| 언어 | TypeScript 5.5+ (strict, `noUncheckedIndexedAccess`) | — |
| 스타일 | **Tailwind CSS v4** | v4 = CSS-first, 빠름 |
| 컴포넌트 | **shadcn/ui** (Radix 기반) + 커스텀 | 복붙 가능, LLM 친화 |
| 아이콘 | **Lucide React** | shadcn 표준 |
| 폼 | `react-hook-form` + `zod` resolver | RSC와도 호환 |
| 검증 | **`zod`** (모든 경계) | 단일 검증 라이브러리 |
| 클라이언트 상태 | **`zustand`** (최소) | RSC가 메인, 클라 상태는 잔여물만 |
| URL 상태 | `nuqs` | 검색/필터 상태 |
| 토스트 | `sonner` | shadcn 표준 |
| 모션 | `framer-motion` | 200~300ms 짧게 |
| 차트 | `recharts` | 대시보드 (S2+) |
| QR | `qrcode` (서버 SVG) + `qrcode.react` (클라) | E5 |
| 일자 | `date-fns` (tree-shake) | dayjs 대신 |
| 국제화 | **`next-intl`** | `en`, `ko` 동시 출시 |
| Markdown | `react-markdown` + `remark-gfm` | 약관/도움말 |
| 분석 | **PostHog** (`posthog-js` + `posthog-node`) | session replay 포함 |
| 에러 | **Sentry** (`@sentry/nextjs`) | source maps |
| 메일 | **Resend** + `react-email` | 매직 링크는 Supabase, 시스템 메일은 Resend |

### 11.2 백엔드 / DB / Auth
| 영역 | 선택 | 비고 |
|---|---|---|
| DB | **Supabase Postgres 15** | RLS 활용 |
| ORM | **Drizzle ORM** + `drizzle-kit` | 마이그레이션 스크립트 |
| 클라이언트 | 서버 = Drizzle 직접 / 브라우저 = `@supabase/ssr` (auth만) | 역할 분리 명확 |
| Auth | **Supabase Auth** | Magic Link + Google + Apple |
| Storage | **Supabase Storage** | 앱 tarball, 빌드 아티팩트 |
| 결제 | **Stripe** (`stripe@latest`) | Checkout + Subscriptions + Customer Portal |
| 결제 webhook | Vercel Edge Function (서명 검증) | 멱등성 키 |
| Webhook 큐 | **`@upstash/qstash`** (재시도/지연) | 빌드 트리거 신뢰성 |
| 캐시 | **Upstash Redis** | 세션, 레이트리밋 |
| 레이트 리밋 | `@upstash/ratelimit` | 비콘 API |

### 11.3 AI 레이어 (`packages/ai`)
| 영역 | 선택 | 비고 |
|---|---|---|
| SDK | **`@anthropic-ai/sdk`** | — |
| 모델 라우팅 | 일반: **Claude Sonnet 4.6** / 복잡 코드 생성: **Claude Opus 4.7** / 분류·요약: **Claude Haiku 4.5** | 비용 균형 |
| 캐싱 | **Prompt caching** 시스템 프롬프트 + 컨텍스트 블록 (1h TTL 갱신) | 비용 핵심 |
| 에이전트 | **Claude Agent SDK** (도구 호출 루프) | S1+ |
| 안전성 | 생성 코드 정적 검증: `tsc --noEmit` + Biome lint + `tsx` smoke run | S1+ |
| 프롬프트 관리 | 코드 내 (TS 모듈, 버전 태그) | 외부 레지스트리 안 씀 |

### 11.4 산출물 — 생성되는 모바일 앱 (`templates/expo-base`)
| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | **Expo SDK 52** (RN 0.76, New Architecture on) | Bridgeless, 빠름 |
| 언어 | TypeScript 5.5+ (strict) | — |
| 라우팅 | **Expo Router v4** (filesystem) | LLM 친화적 |
| 스타일 | **NativeWind v4** (Tailwind for RN) | 콘솔과 같은 멘탈 모델 |
| 컴포넌트 | **자체 얇은 레이어** (NativeWind 기반) — `Button`, `Input`, `Card`, `Sheet`, `List` | tamagui/gluestack은 LLM 생성 복잡도 ↑ |
| 아이콘 | **`@expo/vector-icons` + Lucide RN** | — |
| 폼 | `react-hook-form` + `zod` | — |
| 모션 | **`react-native-reanimated` v3** + `react-native-gesture-handler` | Expo 기본 포함 |
| 네비게이션 | Expo Router (Tabs, Stack) | S4부터 본격 |
| 상태 | `zustand` + Async Storage 영속화 (`zustand/middleware`) | 가볍게 |
| 데이터 fetching | `@tanstack/react-query` v5 | 컨텍스트 비콘에도 사용 |
| 폰트 | **`expo-font`** + Inter (기본) + 컨텍스트 기반 secondary | — |
| 이미지 | **`expo-image`** | Image보다 빠름·캐시 좋음 |
| 알림 | `expo-notifications` (S6+) | — |
| 앱 아이콘/스플래시 | `expo-splash-screen` + 동적 생성(아이콘 만드는 LLM은 S5) | — |
| 빌드/배포 | **EAS Build** + **EAS Update** + **EAS Submit**(S7) | — |
| 분석 | **PostHog React Native** | 콘솔과 동일 PostHog 프로젝트 |
| 에러 | **Sentry Expo** | source maps EAS 통합 |
| 비콘 | 자체 fetch wrapper (App-start, screen-view, action) | 토큰 빌드 시 임베드 |

### 11.5 인프라 / DevOps
| 영역 | 선택 |
|---|---|
| 모노레포 | pnpm 9 + Turborepo 2 |
| 린트/포맷 | **Biome 1.x** (단일 도구) |
| 테스트 | Vitest (유닛) · Playwright (콘솔 E2E) · Detox (산출물 E2E, S4+) |
| 호스팅 | Vercel (콘솔) · Supabase (DB/Auth/Storage) · Upstash (Redis/QStash) · EAS (빌드) |
| 도메인 | **`appee.app`** (등록 필요) — 추천 |
| CDN/이미지 | Vercel 자체 |
| 시크릿 | Vercel Env + GitHub Actions Secrets + 1Password (사람) |
| CI | GitHub Actions (lint/typecheck/test/db-migrate-check) |
| CD | Vercel auto (콘솔) · EAS Build per-PR은 main만 (비용) |
| 환경 | dev (로컬) · staging · prod (Supabase·Vercel·Stripe 모두 분리) |
| 모니터링 | Sentry (에러) · PostHog (제품) · Vercel/Supabase 로그 |
| 알림 | Slack incoming webhook (배포/장애) |

---

## 12. 디자인 시스템

### 12.1 브랜드 아이덴티티 (appee 자체)
| 요소 | 선택 | 의도 |
|---|---|---|
| **퍼스널리티** | Warm, encouraging, "이건 당신의 앱이에요" 톤 | 경쟁사 대부분이 cold-tech ("Generate your app") — 대비점 |
| **워드마크** | 소문자 `appee`, 둥근 e (이중 e가 만드는 무한 루프 = 항상 진화) | 발음·기억 쉬움 |
| **컬러 — Primary** | `orange-500` `#F97316` (warm, 사람의 따뜻함) | tech crowd의 blue/purple 회피 |
| **컬러 — Accent** | `violet-500` `#8B5CF6` (창의·상상) | primary와 보색 균형 |
| **컬러 — Neutrals** | `zinc` 스케일 (slate보다 따뜻) | — |
| **컬러 — Semantic** | success=`emerald-500`, warning=`amber-500`, error=`rose-500` | shadcn 정합 |
| **다크 모드** | 기본 라이트, 시스템 따라 자동 전환 | 콘솔은 라이트가 기본 무드 |
| **타이포그래피** | UI=`Inter` / Mono=`Geist Mono` / Display(랜딩만)=`Instrument Serif` | 가독성 + 무드 변주 |
| **타입 스케일** | 1.25 (major third) | 12·14·16·20·24·30·36·48 |
| **간격 스케일** | 4-base (4·8·12·16·24·32·48·64) | Tailwind 기본 |
| **모서리** | `radius-md=10px` 기본 / 카드=`14px` / 버튼=`8px` | 둥글되 과하지 않게 |
| **그림자** | 3-tier (sm/md/lg) — 매우 약하게 (warm tone) | 디지털 노이즈 적게 |
| **모션** | `easeOut`, 200~300ms / 페이지 전환 fade+slide-y(8px) | 빠르고 부드럽게 |
| **아이코노그래피** | Lucide (1.5 stroke) | shadcn 표준 |
| **일러스트** | 손그림 느낌의 SVG 픽토그램 (Pre-S0 디자이너 의뢰 또는 AI 생성) | 따뜻한 인상 강화 |
| **사진/이미지** | 가능하면 사용자 자기 폰 사진 활용 (S2+) | "내 앱" 정체성 |
| **마이크로카피 톤** | Second-person, encouraging, 짧게. 예: "이건 당신의 앱이에요" / "다음엔 뭘 더할까요?" / "잘했어요!" | 경쟁사의 명령형("Generate", "Build")과 대비 |

### 12.2 콘솔 UX 원칙
1. **항상 폰 미러를 보여줄 것** — 콘솔 우측에 사용자 폰 화면 미러 (Maestro 또는 Expo dev tools 활용). 변경의 즉각적 인지.
2. **카드 기반** — 모든 결정 단위 = 카드 한 장. 카드는 적용/해제 가능 (역순 워크플로우의 자연스러운 매핑).
3. **인지 부하 최소화** — 한 화면에 결정 1개. "다음에 뭘 채울까요?" 형태로 1순위 카드만 prominent.
4. **명령형 금지, 제안형 사용** — "Generate this" 대신 "이거 어때요?".
5. **Undo first-class** — 모든 적용은 즉시 롤백 가능. 빌드 완료 후에도 이전 빌드 install_url 유지.
6. **로딩은 정보로 채울 것** — 빌드 1~3분 동안 컨텍스트 인터뷰 진행 (P1 약속 보호).

### 12.3 산출물 디자인 시스템 (appee가 만드는 앱들의 베이스)
| 영역 | 선택 |
|---|---|
| **토큰 카테고리** | color(50~950 11단계) · spacing · radius · shadow · type · motion |
| **토큰 매핑 규칙** | 컨텍스트 → 토큰 자동 매핑 (S2+에서 본격) — 예: "차분한 무드" → 채도 ↓ 35%, 모서리 ↑ 16px |
| **베이스 컴포넌트** | `Screen`, `View`, `Text`, `Button`, `Input`, `Card`, `List`, `ListItem`, `Avatar`, `Sheet`, `Modal`, `Tabs`, `Header` (총 15개 미만) |
| **다크/라이트** | 모든 토큰은 light/dark 양쪽 정의. 시스템 따라 자동 |
| **접근성** | 최소 44pt 터치 타겟, AA 대비비, 다이내믹 타입 지원 |
| **국제화 준비** | 모든 텍스트 i18n 키 (S2부터 활성, S0는 placeholder) |
| **모션 가이드** | 화면 전환 250ms ease-out / 버튼 누름 100ms / 리스트 push 200ms |

### 12.4 디자인 결정의 일관성 보증
- 콘솔과 산출물의 토큰 이름은 **동일** (`primary-500`, `radius-md` 등). LLM이 두 코드베이스에 같은 이름을 출력해도 의미 일치.
- 토큰 정의는 `packages/shared/tokens.ts`에 단일 소스. 콘솔(Tailwind preset)과 산출물(NativeWind config) 둘 다 여기서 import.

---

## 13. 사용자 여정 — 단계별 선택지 전부 (모든 결정 포함)

> 본 섹션은 **사용자 워크플로우 레이어**다. 메모리 `feedback_focus_separation.md`를 따라 §6 (개발 작업)과 명확히 분리.
>
> 각 단계의 선택지는 appee가 **먼저 추천**하고, 사용자는 받아들이거나 변경. 빈 캔버스 강요 금지 (P1).

### 0단계 — 랜딩 (`appee.app`)
- 메인 카피: **"5분 안에 당신만의 앱을 폰에 설치하세요."**
- 부캐피: "사용할수록 당신에게 더 맞춰집니다."
- CTA: `Start with $0 (7-day free trial)`

### 1단계 — 가입 (Slice 0)
| 선택지 | appee 기본 추천 |
|---|---|
| 인증 방법 | **Apple / Google / 이메일 매직 링크** 3개 동시 제시. 모바일 사용자는 Apple/Google 80% 가정 |
| 언어 | 브라우저 언어 자동 감지 (`en`/`ko`) — 변경 가능 |
| 약관 | 가입 시 1체크 (ToS + Privacy 통합) |

### 2단계 — 결제 (Slice 0)
| 선택지 | appee 기본 추천 |
|---|---|
| 플랜 | **Solo $19/mo** (기본 선택) / Solo Yearly $190/yr (2개월 무료) — 2 옵션만 |
| 트라이얼 | **7일 무료, 카드 등록 필요** (이탈률 ↓, 결제 게이트 검증 필수) |
| 결제 방법 | Stripe Checkout (카드 / Apple Pay / Google Pay 자동) |
| 환불 | 트라이얼 중 언제든 취소 가능, 결제 후 7일 내 환불 보장 (마이크로카피로 안심) |

### 3단계 — 첫 한 줄 (Slice 0; S1부터 AI 생성)
| 선택지 | appee 기본 추천 |
|---|---|
| 입력 | **"내 앱은 ___이에요."** 한 줄. placeholder 예: "매일 명상 알람을 받는 앱" |
| 길이 | 최대 200자. 그 이상은 "잠시, 인터뷰로 더 들어볼게요" (S2 트리거) |
| 빈 칸 허용 | 안 됨. 비워둘 거면 placeholder 그대로 적용해 일단 빌드 |

### 4단계 — 빌드 대기 (Slice 0; 1~3분)
| 선택지 | appee 기본 추천 |
|---|---|
| 화면 구성 | 좌측에 빌드 진행 단계 / 우측에 **컨텍스트 인터뷰 자동 시작** (S2; S0는 단순 진행바) |
| 인터뷰 첫 질문 (S2) | "이 앱을 누구를 위해 만들고 있어요?" (자기/가족·친구/동료·고객/모르겠음) |

### 5단계 — 폰 설치 (Slice 0)
| 선택지 | appee 기본 추천 |
|---|---|
| 방법 | **QR + Android APK 직접 설치** (Slice 0 한정) / iOS는 S5에서 TestFlight |
| 설치 가이드 | 한 화면 짜리 GIF (3초) |
| 확인 | "설치 완료" 버튼 (S0) → 자동 비콘 (S1+, 폰에서 앱 1초 실행 시 자동) |

### 6단계 — 컨텍스트 인터뷰 (Slice 2부터)
> 빌드 대기 시간을 활용. 8문항. 카드 스택 형태로 한 장씩.

| # | 질문 | 선택지 (appee 추천) | 산출물 영향 |
|---|---|---|---|
| 1 | 누구를 위한 앱? | 나만 / 가족·친구 / 일·고객 / 공개 | 권한·공유 흐름 |
| 2 | 어떤 무드? | 차분 / 활기 / 진지 / 장난스러움 | 컬러 채도·모션 |
| 3 | 정보 밀도? | 미니멀 / 균형 / 풍부 | 폰트·spacing |
| 4 | 좋아하는 앱 3개 | 자유 입력 (Linear, Notion, Strava 등) | 패턴 참조 |
| 5 | 사용 빈도? | 매일 여러 번 / 매일 / 주 몇 번 / 가끔 | 알림·홈 위젯 |
| 6 | 라이트/다크? | 시스템 / 라이트 / 다크 | 테마 기본값 |
| 7 | 폰트 무드? | 둥근 / 각진 / 클래식 | 타입페이스 |
| 8 | 가장 중요한 것 한 가지? | 자유 입력 | 첫 화면 hero |

답안은 `user_contexts` 테이블에 저장 + 향후 모든 LLM 호출에 prompt cache로 주입.

### 7단계 — 역순 채우기 (Slice 3부터; appee의 핵심 차별점)
> "지금 당신의 앱"이 항상 화면에 보이고, **"다음에 채울 것"** 카드가 1장 prominent.

| 채우는 순서 (appee 추천) | 선택지 |
|---|---|
| **카드 ①: 메인 화면의 hero** (8단계 → 7단계로 내려옴) | AI가 인터뷰 답 기반 3가지 시안 카드. 사용자는 1개 선택 또는 "다른 거" |
| **카드 ②: 두 번째 화면** (7→6) | "이 앱에서 자주 할 행동 3개" 추천 → 각각 화면 |
| **카드 ③: 정보 구조** (6→5) | 탭 / 스택 / 사이드 — appee가 인터뷰 5(빈도)·1(누구) 보고 추천 |
| **카드 ④: 데이터** (5→4) | "저장할 게 있어요?" → 로컬(없으면)·계정 동기화·공개 공유 |
| **카드 ⑤: 통합** (4→3) | 알림·캘린더·연락처·카메라 — 컨텍스트 보고 필요한 것만 추천 |
| **카드 ⑥: 디자인 토큰** (3→2) | 컨텍스트 → 토큰 자동, 사용자는 microadjust |
| **카드 ⑦: 컨셉/이름/아이콘** (2→1) | AI가 후보 3개 → 사용자 픽 |
| **카드 ⑧ (재방문): 운영화** | 스토어 출시 (S5/S7), 유료화 (사용자가 자기 앱에 결제 붙이기 — 미래) |

각 카드 적용 시:
1. 변경이 **JS-only**면 EAS Update로 폰에 즉시 반영 (수 초~1분).
2. 변경이 **네이티브**(예: 알림 권한, 새 모듈)면 자동 EAS Build (1~3분, 알림으로 통지).

### 8단계 — 출시 (Slice 5/S7)
| 선택지 | appee 기본 추천 |
|---|---|
| 트랙 | **TestFlight (iOS) + Play Internal (Android)** 동시. 본 출시는 사용자 의지로 |
| 번들 ID | `app.appee.user-{shortid}.{slug}` 자동 생성, 변경 가능 |
| 앱 이름 | 컨셉 카드(⑦)에서 결정된 값 |
| 아이콘 | 컨텍스트 기반 AI 생성 3안 → 사용자 선택 |
| 메타데이터(설명/카테고리/키워드) | AI 자동 작성, 사용자 검토 |
| 스크린샷 | 실기기 자동 캡처 (Detox 또는 Maestro) |
| 심사 대응 | 거절 사유 자동 분류 → 추천 패치 → 재제출 1클릭 |

### 9단계 — 진화 (Slice 6+)
| 선택지 | appee 기본 추천 |
|---|---|
| 사용 패턴 수집 | PostHog 이벤트 (스크린뷰·액션·체류시간) → 컨텍스트로 환원 |
| 제안 트리거 | "지난 2주간 X 화면을 거의 안 쓰셨어요. 바꿀까요?" 카드. **거절 누적 시 더 묻지 않음** |
| 정기 리뷰 | 월 1회 "이번 달 당신의 앱" 리포트 (PostHog 인사이트) |

### 10단계 — 공유 (Slice 8)
| 선택지 | appee 기본 추천 |
|---|---|
| 친구 초대 | 링크 생성. 친구도 가입+결제 시 양쪽 1개월 무료 |
| 공유 모드 | "내 앱을 보여주기"(Read-only TestFlight 링크) / "같이 만들기"(공동 편집 — 미래) |

### 사용자 결정 트리 요약 (텍스트)

```
가입 (Apple/Google/Email)
  → 언어 자동
  → 결제 ($19/mo or $190/yr, 7d trial)
    → 한 줄 입력 ("내 앱은 ___")
      → [빌드 1~3분 동안] 컨텍스트 인터뷰 8문항
      → QR로 폰 설치 (Android S0; iOS S5)
        → 역순 카드 ①~⑧ (각 1~5분, 몇 시간~며칠 분산 OK)
          → 매 카드 적용 시 폰 앱 자동 갱신
          → ⑧ 운영화 카드에서 스토어 출시 결정
            → TestFlight + Play Internal 동시 (옵션)
              → 사용 텔레메트리 → 진화 제안 (S6)
                → 공유 (S8)
```

**모든 단계에서 사용자가 "잘 모르겠어요"를 누를 수 있다 → appee가 추천대로 진행.** 이게 P1·P2의 핵심 약속.

---

## 📋 Analysis (Plan Skill 표준 섹션)

- **요구사항**: appee 모바일 개발 프로젝트의 top-down 마스터 플랜 + Slice 0 티켓 분해.
- **영향 파일/컴포넌트**: 빈 레포 → 본 문서가 정의하는 모노레포 구조 전체.
- **의존성/영향**: Supabase, Stripe, EAS, Vercel 외부 계정 신규 생성 필요.
- **모호함**: D1~D4 (도메인, Apple/Google 계정, 가격, 언어) — 추천 적용했으나 사용자 검토 권장.

## 🛠️ Implementation Steps

상세는 §6 (E0~E7 에픽) 참조. 직렬 의존: `E0 → E1 ∥ E2 → E3 → E4 → E5 → E6 → E7`.

## 🧪 Tests

- 유닛: `packages/builder` 템플릿 치환 엔진(E3-3), 컨텍스트 zod 스키마.
- 통합: Stripe webhook 핸들러(E2-4), EAS webhook 핸들러(E4-5).
- E2E (Playwright): Slice 0 합격선 시나리오(E7-1).
- 수동 검증: 실제 Android 폰 설치 + 사용량 +1(E7-2).

## 👀 Review Checklist

- [ ] 4개 차별화 기둥(P1~P4) 위반 여부.
- [ ] 메모리 4개 운영 원칙 위반 여부.
- [ ] 결제 게이트 server-side 재검증(E4-8) 누락 여부.
- [ ] 산출물 토큰 유출 방어(R4).
- [ ] 비용 측정(E7-3) 포함 여부.
- [ ] 영문/한국어 동시 출시(D4) 적용 여부.
- [ ] Slice 0 합격선이 "사람 손 개입 없이 완주"임을 검증.
