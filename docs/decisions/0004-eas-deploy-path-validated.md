# ADR 0004 — EAS Android APK 배포 경로 검증 (Walking Skeleton)

> Status: Accepted · 2026-05-22
>
> Related: [ADR 0001](0001-android-first-s0.md) (Android-first), [Slice 0 정의](../methodology/top-down.md#layer-2--slice-top-down-walking-skeleton)

## Context

Slice 0 본 구현(콘솔 + 워커 + Supabase + Stripe) 시작 전, **"hello world 수준 RN 앱이 진짜로 EAS Build 통과해서 안드로이드 기기에 설치되는가"**의 검증만 따로 분리해 수동 실행. 통합점 #3 ("EAS Build를 서버에서 프로그램적으로 트리거/모니터링", [project_slice_0](../../.claude/projects/...))의 가장 깊은 부분을 자동화 코드 짜기 전에 확인.

실제 검증 빌드: `bradyoo12/appee-hello-base` build `9866e401-0a52-46aa-b715-3072225fad3d` (2026-05-22). 안드로이드 태블릿에서 APK 설치 후 `한 줄: "{{HEADLINE}}"` 렌더 확인.

이 과정에서 **3개의 환경 종속 함정**이 발견됨. 본 ADR은 이를 박제해 Slice 0 본 구현 때 같은 함정에 안 빠지게 함.

## Decision

`templates/expo-base`가 EAS Android 빌드 통과하려면 **다음 3개 설정을 반드시 유지**한다.

### 1. `.npmrc`에 `node-linker=hoisted`

위치: 워크스페이스 루트 [.npmrc](../../.npmrc)

```ini
auto-install-peers=true
strict-peer-dependencies=false
node-linker=hoisted
engine-strict=true
```

**Why:** pnpm의 기본 strict isolation은 transitive deps를 hoisting 안 함. Metro 번들러는 `node_modules/` 평탄 lookup을 가정하므로 expo / expo-router의 deep transitive(`@expo/metro-runtime`, `@babel/runtime/helpers/*` 등)를 못 찾고 **`Unable to resolve module ...`로 Bundle JS phase에서 실패**.

`node-linker=hoisted`는 pnpm을 "npm처럼" flat `node_modules`로 동작시킴. content-addressable store는 유지되어 디스크/속도 손해는 거의 없음.

**Trade-off:** 다른 워크스페이스 패키지(추후 `apps/console`, `packages/builder`)에서 phantom dependency 위험. 수용 — RN/Expo 호환성이 우선.

### 2. `@expo/metro-runtime`을 템플릿 deps에 명시

위치: [templates/expo-base/package.json](../../templates/expo-base/package.json)

```json
"dependencies": {
  "@expo/metro-runtime": "~4.0.1",
  "expo": "~52.0.11",
  ...
}
```

**Why:** `expo-router/entry-classic.js`가 `import '@expo/metro-runtime'` 하는데 expo-router의 명시 dep이 아님(peer/transitive 취급). `node-linker=hoisted`만으로도 해결되긴 하지만, **safety net으로 명시 선언**을 두어 hoisting 정책이 바뀌어도 깨지지 않게 함.

### 3. `expo-build-properties` 플러그인으로 Kotlin 1.9.25 핀

위치: [templates/expo-base/app.json](../../templates/expo-base/app.json)

```json
"plugins": [
  "expo-router",
  ["expo-build-properties", { "android": { "kotlinVersion": "1.9.25" } }]
]
```

deps:
```json
"expo-build-properties": "~0.13.1"
```

**Why:** Expo SDK 52의 `expo-modules-core@2.2.3`이 Compose Compiler 1.5.15를 쓰는데, 이게 Kotlin **1.9.25**를 요구. EAS Build 기본 이미지는 1.9.24라 `:expo-modules-core:compileReleaseKotlin` 단계에서 실패:

```
This version (1.5.15) of the Compose Compiler requires Kotlin version 1.9.25
but you appear to be using Kotlin version 1.9.24
```

Expo SDK 53+가 나오면 기본 이미지가 호환되는 Kotlin으로 올라갈 것이므로 **SDK 업그레이드 시 이 플러그인 제거 가능성** 검토.

## Validation

이번 빌드에서 **수동으로 실행한 경로**(자동화 시 그대로 재현해야 함):

1. 워크스페이스 루트: `pnpm install` (hoisted 레이아웃)
2. `cd templates/expo-base`
3. `eas login` (PAT 또는 OAuth)
4. `eas init` → `app.json`의 `extra.eas.projectId` 자동 등록
5. `eas build -p android --profile preview` (eas.json의 `internal` distribution + `apk` buildType)
6. 빌드 완료 시 URL/QR 제공
7. 안드로이드 기기 브라우저로 URL 열기 → "Install" 버튼 → APK 다운로드 → "출처 알 수 없는 앱" 허용 → 설치
8. 앱 실행 시 `한 줄: "{{HEADLINE}}"` 렌더 (placeholder 미치환 = template 통과 증거)

EAS 빌드 시간: ~7~10분 (free tier 큐 포함).

## Consequences

### Slice 0 본 구현 시 자동화 매핑

| 수동 단계 | 자동화 위치 |
|---|---|
| 1, 2 (template clone + cd) | 워커에서 임시 디렉토리에 zip 만들기 |
| 3 (eas login) | 서버 env `EXPO_TOKEN` (PAT) |
| 4 (eas init) | 사용자당 EAS project 생성 또는 단일 project 재사용 (별도 결정) |
| 5 (eas build) | EAS REST API `POST /v2/projects/{id}/builds` 또는 워커에서 `eas-cli` 셸아웃 |
| 6 (URL/QR) | EAS webhook → Supabase row 업데이트 → 콘솔에서 `qrcode` 렌더 |
| 7, 8 | 사용자 폰에서 그대로 (변화 없음) |

### Forward-looking 검증 필요 항목

본 ADR은 **수동 경로**만 검증. 자동화 시 추가로 깨질 가능성:

- EAS REST API 직접 호출 시 빌드 trigger 페이로드 구조
- pre-substituted zip 업로드 vs git URL 방식의 차이
- 사용자당 EAS project 생성 API rate limit
- Free tier 빌드 큐가 사용자 경험에 미치는 영향 (`5분 안에 설치` 약속과 충돌 여부)

### Project ID 처리

현재 `templates/expo-base/app.json`에 `extra.eas.projectId = 5deac01b-...`가 박혀 있음. 이건 **검증용 단일 project**의 ID. Slice 0 본 구현 시:

- **옵션 A** — 사용자당 project 생성, `app.json`을 사본/치환 단계에서 교체
- **옵션 B** — 단일 project 공유, 빌드의 `metadata.userId`로 라우팅

옵션 B가 가볍지만 빌드 리스트 폴루션. **별도 ADR(0005)에서 결정**.

## References

- 검증 빌드: https://expo.dev/accounts/bradyoo12/projects/appee-hello-base/builds/9866e401-0a52-46aa-b715-3072225fad3d
- pnpm + Expo monorepo: https://docs.expo.dev/guides/monorepos/
- `node-linker=hoisted`: https://pnpm.io/npmrc#node-linker
- `expo-build-properties`: https://docs.expo.dev/versions/latest/sdk/build-properties/
