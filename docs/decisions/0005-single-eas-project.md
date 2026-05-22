# ADR 0005 — 단일 EAS Project + Supabase 매핑

> Status: Accepted · 2026-05-22
>
> Related: [ADR 0004](0004-eas-deploy-path-validated.md) (Walking skeleton 검증), [ADR 0006](0006-vercel-eas-rest-no-worker.md) (빌드 트리거 위치)

## Context

[ADR 0004 §Project ID 처리](0004-eas-deploy-path-validated.md)에서 미결로 남긴 항목. appee가 생성하는 모든 사용자 앱의 빌드를 EAS에서 어떻게 격리할지 두 가지 선택지:

- **옵션 A** — 사용자당 EAS project 1개 자동 생성
- **옵션 B** — 단일 EAS project 공유, 빌드의 `metadata.userId`로 라우팅

## Decision

**옵션 B 채택.** Slice 0~S4 동안 단일 EAS project (`appee-user-builds`, appee 조직 소유) 1개를 모든 사용자가 공유한다. 사용자/앱 라우팅은 EAS Build의 `metadata` 필드 + Supabase `apps` 테이블의 `eas_build_id` 컬럼 조합으로.

### 데이터 흐름

```
[빌드 트리거]
  Vercel → EAS GraphQL mutation createBuild (https://api.expo.dev/graphql)
    input.projectId = APPEE_PROJECT_ID
    input.metadata = { userId: "u_xxx", appId: "a_yyy", headline: "..." }
    응답 data.build.{...}.id 저장 → apps.eas_build_id

[빌드 완료 webhook]
  EAS → Vercel /api/eas/webhook
    body.buildId 로 apps 테이블 조회
    apps.user_id 로 사용자 식별 (metadata 신뢰 X, DB 조회로 검증)
```

### 신뢰 경계

- `build.metadata`는 **편의용 라벨**일 뿐, 권한 결정에 쓰지 않음.
- 사용자별 빌드 조회는 **항상 Supabase `apps` 테이블 RLS**로 격리.
- EAS dashboard에서 모든 빌드가 한 list에 섞여 보이는 건 운영자(우리) 시점만의 문제.

## Rationale

### 옵션 B가 이긴 이유

1. **인프라 단순** — Expo project 생성 API는 OAuth/PAT 권한이 필요하고 rate limit 있음. 사용자 가입할 때마다 호출은 실패 경로가 늘어남.
2. **빌드 트리거 단순** — `projectId`가 env 상수 1개. 사용자당 lookup 없음.
3. **EAS 청구 단순** — 하나의 project = 하나의 청구 라인. 옵션 A는 organization-level rollup 필요.
4. **Slice 0 본질에 부합** — Walking skeleton의 통합점 검증이 목적이지 멀티테넌시가 아님. 멀티테넌시는 옵션 A로 갈아끼울 시점에 별도 결정.

### 옵션 A가 졌지만 가져올 가치

옵션 A의 진짜 장점은 **사용자가 본인 Expo 계정으로 빌드 소유권을 가져갈 수 있다**는 점 — S7(Store Deployment) 단계에서 필요. 그 시점에 ADR로 재결정.

## Consequences

### 즉시 영향

- **`apps` 테이블 스키마** ([#34 E3-2](https://github.com/bradyoo12/appee/issues/34)):
  - `eas_project_id` 컬럼 **불필요** (전역 상수)
  - `eas_build_id` 컬럼 **필수** (사용자별 라우팅 키)
- **Vercel env**:
  - `EXPO_TOKEN` — appee 조직의 PAT
  - `APPEE_EAS_PROJECT_ID` — `appee-user-builds`의 projectId
- **EAS organization 생성** — appee 조직을 expo.dev에 만들고 project 1개 provision. 1회 수동.

### 갈아끼울 신호 (옵션 A로 이전 트리거)

- **신호 1: Free tier 빌드 큐 폭증** — 모든 사용자 빌드가 한 큐에 몰려 5분 약속 깨짐. 큐 분리 필요해지면 project 분리도 함께.
- **신호 2: 사용자가 본인 앱을 본인 스토어 계정으로 출시** (S7) — Expo project owner = 스토어 계정과 결이 맞아야 함.
- **신호 3: Enterprise 고객 데이터 격리 요구** — EAS dashboard에서 다른 사용자 빌드가 안 보여야 한다는 계약 요구.

### 검증용 project (`appee-hello-base`) 처리

ADR 0004에서 만든 `5deac01b-4fdd-4b39-87eb-aad5f8b0130d`는 **walking skeleton 검증 전용**으로 유지. Slice 0 본 구현은 새 project `appee-user-builds`를 별도 생성. 두 project가 공존하다가 S0 완료 후 검증용은 보존(레퍼런스용) 또는 archive.

## References

- EAS REST API — projects/builds: https://docs.expo.dev/build-reference/build-api/
- EAS Build metadata: https://docs.expo.dev/build-reference/eas-json/#metadata
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
