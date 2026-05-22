# ADR 0006 — Vercel + EAS REST 직접 호출 (별도 워커/CLI 없음)

> Status: Accepted · 2026-05-22
>
> Related: [ADR 0004](0004-eas-deploy-path-validated.md) (Walking skeleton 검증), [ADR 0005](0005-single-eas-project.md) (단일 project)

## Context

Slice 0의 빌드 트리거 자동화에서 후보 세 가지:

1. **Vercel function에서 EAS REST API 직접 호출** — 별도 인프라 0
2. **GitHub Actions `workflow_dispatch`** — Actions 러너가 `eas build` 실행
3. **Render/Fly 등 별도 worker container** — 전용 컨테이너

Vercel은 함수 시간 제한(Hobby 60s, Pro 300s)이 있어 "긴 빌드는 못 돌린다"는 통념이 있지만, **실제 빌드는 EAS 클라우드에서 실행**되므로 Vercel은 trigger만 하면 됨. 30~60초 한도 안에 들 가능성이 높음.

## Decision

**옵션 1 (Vercel function + EAS REST API) 채택.** 별도 worker / GitHub Actions / CLI 런타임 의존 없음.

### 흐름

```
[사용자 입력 → Server Action]
  Vercel function (≤60s 안에 완료):
    1. apps row insert (status='preparing')
    2. templates/expo-base read (배포 bundle에서 fs.readFile)
    3. {{HEADLINE}} + per-user 메타 치환 (in-memory)
    4. tar.gz 생성 (in-memory)
    5. Supabase Storage 업로드 → signed GET URL 발급 (24h)
    6. EAS REST: POST /v2/projects/{APPEE_EAS_PROJECT_ID}/builds
       Authorization: Bearer ${EXPO_TOKEN}
       body: {
         platform: 'android',
         buildProfile: 'preview',
         projectArchive: { type: 'URL', url: <signed Supabase URL> },
         metadata: { userId, appId, headline }
       }
    7. apps row update: status='in_progress', eas_build_id=res.buildId
    8. return { appId } to UI

[EAS 빌드 (~10분, 클라우드) → 완료 시 webhook POST]
  Vercel function /api/eas/webhook:
    검증 + apps row update + build_usage insert
```

## Rationale

### 시간 예산

- 템플릿 read: <100ms (fs sync, 작은 파일들)
- 치환: <50ms
- tar.gz: <500ms (수십 KB)
- Supabase 업로드: ~1~3s
- EAS REST POST: ~500ms~2s
- **합계: 5초 안팎.** Vercel 60s 한도에 여유 충분.

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
| Vercel 60s 초과 (Supabase 업로드 느림) | Pro 플랜 300s 또는 streaming upload로 회피 |
| 템플릿 번들 크기 > 50MB | `templates/expo-base/node_modules` 제외, source만 deploy bundle에 포함 ([E3-8](https://github.com/bradyoo12/appee/issues/) 검증) |
| Cold start 지연 | Vercel Functions는 hot path 우선. 첫 사용자만 영향. |
| EAS REST 인증 만료 | PAT는 만료 길거나 무기한. 90일 rotation 정책 별도 |

## Consequences

### 코드 위치

```
apps/console/app/api/builds/create/route.ts   ← Server Action: 입력 → tarball → EAS POST
apps/console/app/api/eas/webhook/route.ts     ← EAS 완료 알림 수신
packages/builder/
  src/substitute.ts                            ← {{HEADLINE}} → 사용자 입력
  src/tarball.ts                               ← tar.gz in-memory
  src/eas/client.ts                            ← REST API wrapper (zod 응답 검증)
```

### Slice 1+ 영향

S1에서 Claude로 코드 생성 추가될 때 흐름:

```
입력 → Claude API (~5~15s) → 생성 코드를 템플릿에 주입 → tarball → EAS
                ↑
        Vercel 60s 한도 위협 가능 — Pro 플랜 또는 streaming 응답 필요
```

본 ADR의 60s 가정이 무너지면 그때 worker 분리 재검토. S1 시작 전 부하 측정 권장.

### CI/CD 무관

EAS REST 호출은 production 환경 변수만 있으면 됨. PR preview에서도 별도 worker 없이 작동. Vercel preview 환경에는 별도 sandbox EAS project를 두는 옵션 검토 (별도 결정).

## References

- EAS REST API Build trigger: https://docs.expo.dev/build-reference/build-api/
- Vercel function 시간 제한: https://vercel.com/docs/functions/runtimes#max-duration
- Vercel deployment 크기: https://vercel.com/docs/deployments/limits
- Supabase Storage signed URL: https://supabase.com/docs/guides/storage/serving/downloads
