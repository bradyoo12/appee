# Demo compliance — `demo/index.html` is the visual source of truth

> 항상 적용. 사용자 지시 (2026-05-10).

## Rule

**모든 사용자 워크플로우 구현(콘솔 UI, 산출물 RN 앱)은 [`demo/index.html`](../../demo/index.html)에 위배되지 않아야 한다.**

데모는 appee 사용자 여정(`landing → signup → billing → input → build+interview → install
→ dashboard → reverse fill → launch`)의 **현재 합의된 시각/UX 사양**이다. 코드가
데모와 충돌하면 — 코드를 고치는 것이 기본이고, 데모를 고치는 것은 명시적
사용자 결정으로만 한다.

## What this covers

- **레이아웃 / 정렬**: 화면 구성, 카드 위치, 정렬 (예: Slice 0 첫 설치 화면은
  중앙정렬이 아니라 좌상단 정렬 + hero 카드 — `demo/index.html` line 633-642).
- **카피 / 언어**: 데모는 한국어로 작성됨. Slice 0 산출물은 데모와 동일한
  한국어를 기본으로 한다 (i18n 도입은 추후 슬라이스).
- **컬러 / 타이포 / 간격**: `demo/index.html` `<script>tailwind.config</script>`
  블록의 brand·accent 팔레트, Inter / Instrument Serif / Geist Mono 패밀리,
  radius (`btn=8 / md2=10 / card=14`), shadow tier — kickoff plan §12 와 일치.
- **모션**: fade+slide-y 250ms ease-out (`out-soft`).
- **흐름 / 단계 라벨**: 9단계 (0~8) 의 명칭과 step counter (`step N / 9`).

## How to apply (every PR / commit)

1. **시작 전**: 변경하려는 화면/플로우의 데모 섹션을 먼저 연다.
2. **구현 중**: 데모와 동일한 카피·컬러·구조를 우선 채택한다. 다른 결정을
   하려면 이유를 적고 사용자 확인을 받는다.
3. **검증 시 체크**:
   - [ ] 카피가 데모와 동일하거나 의도적 분기(이유 기재)인가?
   - [ ] 컬러 토큰 (brand-500 `#F97316`, accent-500 `#8B5CF6`, zinc 스케일)
         외 임의 컬러가 들어갔는가?
   - [ ] 폰트 사이즈/간격이 4-base 스케일에서 벗어났는가?
   - [ ] 모션 시간이 200~300ms 범위를 벗어났는가?
4. **commit / PR 본문**: 데모 어느 라인/섹션을 참조했는지 적는다 (예:
   `Visual: demo/index.html line 633-642`).

## What this does NOT cover

- **개발 인프라**: 모노레포 구조, 빌드 파이프라인, 테스트 — 데모는 사용자
  화면만 다룬다. `appee 만드는 작업` 레이어는 `.claude/plans/00-project-kickoff.md`
  를 따른다.
- **백엔드 동작**: API, DB 스키마, webhook — 데모는 시각/UX 만.

## When the demo and the kickoff plan disagree

데모와 `00-project-kickoff.md` 사이의 충돌은 사용자에게 확인한다. 둘 중 어느
쪽을 update 할지 명시적으로 결정 후 진행한다.

## Slice 0 reference points (자주 참조될 라인)

| 화면 | 데모 라인 | 비고 |
|---|---|---|
| 랜딩 메인 카피 | 184-190 | "5분 안에 당신만의 앱을 폰에 설치하세요." |
| 한 줄 입력 placeholder / 길이 | 376 | textarea, maxlength 200 |
| 빌드 단계 표시 | 458- | step-dot 진행 |
| 첫 설치 hero | 633-642 | **Slice 0 산출물 기본 화면** |
| 대시보드 사용량 카드 | 594-619 | 총 실행 / 최근 실행 / 현재 빌드 |
| 역순 카드 ① hero | 1501-1531 | S3+ |
| 스토어 메타데이터 | 705-761 | S7 |
