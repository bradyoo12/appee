# ADR 0006 — Vercel + EAS GraphQL 직접 호출 (별도 워커/CLI 없음)

> Status: Accepted · 2026-05-22 · Amended 2026-05-22 (REST → GraphQL)
>
> Related: [ADR 0004](0004-eas-deploy-path-validated.md) (Walking skeleton 검증), [ADR 0005](0005-single-eas-project.md) (단일 project)
>
> Filename retains `-rest-` for stable URL/slug; content is GraphQL.

## Context

Slice 0의 빌드 트리거 자동화에서 후보 세 가지:

1. **Vercel function에서 EAS API 직접 호출** — 별도 인프라 0
2. **GitHub Actions `workflow_dispatch`** — Actions 러너가 `eas build` 실행
3. **Render/Fly 등 별도 worker container** — 전용 컨테이너

Vercel은 함수 시간 제한(Hobby 60s, Pro 300s)이 있어 "긴 빌드는 못 돌린다"는 통념이 있지만, **실제 빌드는 EAS 클라우드에서 실행**되므로 Vercel은 trigger만 하면 됨. 30~60초 한도 안에 들 가능성이 높음.

## Decision

**옵션 1 (Vercel function + EAS GraphQL API) 채택.** 별도 worker / GitHub Actions / CLI 런타임 의존 없음.

### EAS API 프로토콜 — GraphQL

본 ADR 초기 작성 시 "REST API (POST /v2/...)"로 표기했으나, 2026-05-22 [Unit 5a 검증 (scripts/eas-test.mjs)](../../scripts/eas-test.mjs)에서 **EAS의 공개 API는 GraphQL endpoint `https://api.expo.dev/graphql` 단일**임이 확인됨. `/v2/builds/...` REST 경로는 모두 404 응답. `eas-cli` 내부도 동일 GraphQL endpoint 사용.

인증: `Authorization: Bearer ${EXPO_TOKEN}` (PAT, 사용자 또는 robot 계정).

### 흐름

```
[사용자 입력 → Server Action]
  Vercel function (≤60s 안에 완료):
    1. apps row insert (status='preparing')
    2. templates/expo-base read (배포 bundle에서 fs.readFile)
    3. {{HEADLINE}} + per-user 메타 치환 (in-memory)
    4. tar.gz 생성 (in-memory)
    5. EAS GraphQL: presigned upload URL 발급 (mutation 정확명 5b에서 확정)
    6. PUT tarball → presigned URL
    7. EAS GraphQL: createBuild mutation (정확명 5b에서 확정)
       POST https://api.expo.dev/graphql
       Authorization: Bearer ${EXPO_TOKEN}
       body: { query: "mutation CreateBuild(...)", variables: { input: { ... } } }
       응답: data.build.{...}.id
    8. apps row update: status='in_progress', eas_build_id=res.data...id
    9. return { appId } to UI

[EAS 빌드 (~10분, 클라우드) → 완료 시 webhook POST]
  Vercel function /api/eas/webhook:
    검증 + apps row update + build_usage insert
```

읽기 (폴링)는 검증된 query 사용 가능:
```graphql
query GetBuild($id: ID!) {
  builds {
    byId(buildId: $id) {
      id status platform createdAt completedAt
      artifacts { buildUrl }
      project { ... on App { id name slug } }
    }
  }
}
```

`status` enum: `NEW`, `IN_QUEUE`, `IN_PROGRESS`, `FINISHED`, `ERRORED`, `CANCELED` (관찰값 + EAS docs).

### Supabase Storage는 선택사항

초기 ADR은 tarball을 Supabase Storage에 올린 뒤 signed URL을 EAS에 전달하는 흐름을 가정했다. GraphQL 흐름에서는 EAS가 자체 presigned upload URL을 제공하므로 **Supabase 경유 없이 직접 EAS로 PUT** 가능. Supabase Storage는 다음 용도로만 쓸지 별도 결정:
- 사용자 archive 보관 (재빌드/디버그용 audit log)
- 다중 환경 간 archive 공유

Slice 0 minimum에선 EAS 직접 업로드로 단순화.

## Rationale

### 시간 예산 (재계산)

- 템플릿 read: <100ms (fs sync, 작은 파일들)
- 치환: <50ms
- tar.gz: <500ms (수십 KB)
- EAS presigned upload URL 발급: ~500ms
- PUT tarball → EAS S3: ~1~3s
- createBuild mutation: ~500ms~2s
- **합계: 5초 안팎.** Vercel 60s 한도에 여유 충분.

(Supabase 경유 안 하므로 초안보다 1~3s 단축.)

### 옵션 2 (GitHub Actions)가 진 이유

- workflow_dispatch trigger도 결국 동기 API. Vercel→GitHub→Actions runner→EAS 홉이 늘어남 = latency 증가.
- runner 부팅 30~60s가 더해짐 (사용자 대기 길어짐).
- Actions 분당 동시성 제한 → 사용자 증가 시 큐 대기.
- GitHub 의존성 추가 (private repo billing 영향).

### 옵션 3 (전용 worker)가 진 이유

- 인프라 추가 (배포 파이프라인, 모니터링, 비밀 관리 별도).
- 빌드 호출 빈도가 낮은 Slice 0에 과잉.
- 실제 빌드는 EAS 클라우드에서 함 — 우리 worker가 길게 살아있을 필요 없음.

### 옵션 1의 위험과 대응

| 위험 | 대응 |
|---|---|
| Vercel 60s 초과 (tarball 업로드 느림) | Pro 플랜 300s 또는 streaming upload로 회피 |
| 템플릿 번들 크기 > 50MB | `templates/expo-base/node_modules` 제외, source만 deploy bundle에 포함 ([E3-8](https://github.com/bradyoo12/appee/issues/) 검증) |
| Cold start 지연 | Vercel Functions는 hot path 우선. 첫 사용자만 영향. |
| EAS PAT 만료 / GraphQL schema 변동 | PAT 90일 rotation 정책 별도. GraphQL schema는 backward-compat 보장 약함 → `eas-cli` 버전과 함께 검증 |

## Consequences

### 코드 위치

```
apps/console/app/api/builds/create/route.ts   ← Server Action: 입력 → tarball → EAS upload → mutation
apps/console/app/api/eas/webhook/route.ts     ← EAS 완료 알림 수신
apps/console/lib/eas/
  client.ts                                    ← GraphQL client (zod 응답 검증)
  queries.ts                                   ← 빌드 read/poll
  mutations.ts                                 ← upload-url 발급 + createBuild
  schemas.ts                                   ← zod types
packages/builder/                              ← (S1+에서 분리)
  src/substitute.ts                            ← {{HEADLINE}} → 사용자 입력
  src/tarball.ts                               ← tar.gz in-memory
```

S0에선 모듈 분리보다 한 파일로 빠르게 — `packages/builder`는 S1 코드 생성 도입 시 분리 결정.

### Slice 1+ 영향

S1에서 Claude로 코드 생성 추가될 때 흐름:

```
입력 → Claude API (~5~15s) → 생성 코드를 템플릿에 주입 → tarball → EAS GraphQL
                ↑
        Vercel 60s 한도 위협 가능 — Pro 플랜 또는 streaming 응답 필요
```

본 ADR의 60s 가정이 무너지면 그때 worker 분리 재검토. S1 시작 전 부하 측정 권장.

### CI/CD 무관

EAS GraphQL 호출은 production 환경 변수만 있으면 됨. PR preview에서도 별도 worker 없이 작동. Vercel preview 환경에는 별도 sandbox EAS project를 두는 옵션 검토 (별도 결정).

### 영향받는 다른 문서 (후속 정리 권장)

GraphQL 정정이 영향을 미치는 곳들:
- [ADR 0005](0005-single-eas-project.md) §Decision: "EAS REST POST /v2/..." → GraphQL mutation
- [ADR 0004](0004-eas-deploy-path-validated.md) §Consequences 매핑 표: "EAS REST API" → "EAS GraphQL"
- GH 이슈 [#39 E4-2](https://github.com/bradyoo12/appee/issues/39): "REST 직접 호출" → "GraphQL 직접 호출"
- GH 이슈 [#42 E4-5](https://github.com/bradyoo12/appee/issues/42): webhook payload는 EAS docs/webhook 검증 후 별도 (REST/GraphQL 무관)

## References

- EAS GraphQL endpoint: `https://api.expo.dev/graphql`
- 검증 스크립트: [scripts/eas-test.mjs](../../scripts/eas-test.mjs) (Unit 5a, 2026-05-22)
- Vercel function 시간 제한: https://vercel.com/docs/functions/runtimes#max-duration
- Vercel deployment 크기: https://vercel.com/docs/deployments/limits
- `eas-cli` 소스 (GraphQL queries/mutations 참고용): https://github.com/expo/eas-cli
