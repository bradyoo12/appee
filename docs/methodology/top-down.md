# Top-Down Development Methodology

> Status: Adopted · 2026-05-10 · Applies to all appee development.
>
> "Top-down"은 한 가지가 아니라 **5개 다른 레이어에서 동시 적용되는 원칙**이다. 한 레이어만 따르면 다른 레이어에서 새는 비효율이 그대로 들어온다.

## Layer 1 — Product top-down

**North Star → 4 pillars → 9 slices → epics → tickets.**

- 마스터 플랜 ([.claude/plans/00-project-kickoff.md](../../.claude/plans/00-project-kickoff.md)) + GitHub 이슈 #1~#67이 이 레이어의 결과물.
- 모든 결정의 tie-breaker. 새 아이디어가 P1~P4 중 하나를 강화하지 않으면 거절.

## Layer 2 — Slice top-down (Walking Skeleton)

**Slice 0가 이 원칙의 화신.**

- Slice 0는 5개 통합점(Auth/Stripe/EAS/Storage/Webhook)을 **얇게** 한 번에 통과.
- 각 통합점은 hello world 수준이지만 **진짜로 작동**해야 함 (스텁/목업 금지).
- Slice N+1은 깊이를 더할 뿐, 새 파이프라인을 추가하지 않음.

원칙: **항상 end-to-end가 살아 있다.**

## Layer 3 — 슬라이스 내부 (UI-first, Contract-driven)

각 슬라이스 안에서도 위에서 아래로:

1. **사용자 여정 와이어프레임** (Figma 또는 ASCII) — 모든 화면 1장씩
2. **API 계약을 zod 스키마로** (`packages/shared/contracts/*.ts`)
3. **백엔드 전부 목업** — 모든 server action이 하드코딩 데이터 반환
4. **목업을 진짜로 하나씩 교체** — Supabase / Stripe / EAS 한 번에 하나씩

UI가 API 계약의 권한자가 됨. bottom-up은 DB 모델이 권한자가 되고 UI가 끌려다님 → P1(5분 약속) 같은 UX 약속이 깨짐.

## Layer 4 — 티켓 내부 (Interface-first)

```
1. 타입/스키마 작성 (zod, TS interface)        ← 계약
2. 스텁 함수: throw new Error('TODO')          ← 골격
3. 계약 기반 테스트 (Vitest)                    ← 검증
4. 구현 채우기                                  ← 살
5. 리팩터                                       ← 정리
```

## Layer 5 — AI-assisted top-down

appee는 AI 제품이고, **만들 때도** AI를 top-down으로 쓴다.

```
사람: 티켓 한 줄 + 합격 기준 + 의존성
  ↓
Claude (Plan agent): 구현 단계 분해, 영향 파일, 트레이드오프
  ↓ (사람 승인)
Claude (Code agent): TodoWrite로 추적하며 실행
  ↓
Claude (Review agent): 합격 기준 검증, 회귀 검사
  ↓
사람: 최종 승인 + 머지
```

위임 효율을 위한 인프라 투자:

- **메모리 갱신** — 의사결정/제약을 `~/.claude/.../memory/`에 기록. 다음 세션 Claude가 같은 결정 재반복 방지.
- **ADR (Architectural Decision Record)** — 비가역 결정은 `docs/decisions/000N-*.md`. 셸 모델 결정 ([#66](https://github.com/bradyoo12/appee/issues/66))이 모범 사례.

## 위반 신호 — 감시 대상

| 신호 | 위반 레이어 | 교정 |
|---|---|---|
| "DB 스키마 먼저 다 짜자" | L3, L4 | 와이어프레임 → 계약 → 스텁부터 |
| "결제는 나중에 붙이자" | L2 | walking skeleton 5개 통합점 원칙 위반 |
| "AI 다듬은 후 빌드" | L2 | walking skeleton은 무조건 통과 |
| "이 기능은 모두 좋아할 거" | L1 | P1~P4 강화 여부 재검증 |
| 한 티켓이 5일 초과 | L3, L4 | 목업으로 우회 못 한 부분이 있음 → 분해 |
| 코드베이스가 실행 안 되는 날 | 전부 | "항상 end-to-end 살아있음" 원칙 위반 |

## 안티패턴 갤러리

### 안티패턴: "DB부터 짠다"

❌ Bottom-up:
```
1. users 테이블
2. RLS 정책
3. Supabase Auth 통합
4. SSR 미들웨어
5. 로그인 페이지
→ 5번 끝나야 클릭 가능. 4일간 데모 불가.
```

✅ Top-down:
```
1. 로그인/대시보드 와이어프레임 (반나절)
2. Auth 계약 zod (반나절)
3. mock auth + 모든 페이지 (1일) ← 여기서 클릭 가능
4. mock → Supabase Auth 교체 (1일)
5. users 테이블 + RLS (반나절)
6. 세션 만료 처리 (반나절)
```

1.5일째부터 데모 가능. 이후 매일 데모가 깨지지 않게 진짜화.

### 안티패턴: "스텁이 너무 부끄러우니 진짜로 만들고 보여주자"

스텁이 부끄러운 게 아니라, **스텁 없이 4일 동안 데모 못 하는 게** 부끄러움. 진짜화는 영원히 할 시간이 있고, 데모는 매일 가능해야 함.

### 안티패턴: "이 한 티켓에 추가 리팩터 좀 같이..."

티켓 범위 밖 변경은 티켓 분해. 5일 넘는 티켓 = 분해 신호.

## 적용 체크리스트 (PR 셀프 리뷰)

- [ ] L1: 이 변경이 P1~P4 중 어느 기둥을 강화하는가?
- [ ] L2: 변경 후에도 end-to-end가 작동하는가?
- [ ] L3: UI가 API 계약을 정의했는가, 그 반대가 아닌가?
- [ ] L4: zod/TS 계약이 구현보다 먼저 머지됐는가?
- [ ] L5: 비가역 결정이 ADR로 기록됐는가? 메모리/CLAUDE.md 갱신됐는가?

## 참고

- 마스터 플랜: [`.claude/plans/00-project-kickoff.md`](../../.claude/plans/00-project-kickoff.md)
- 모범 ADR: [#66 Shared Shell Architecture](https://github.com/bradyoo12/appee/issues/66)
- 메모리 인덱스: `~/.claude/projects/e--Github-bradyoo12-appee/memory/MEMORY.md`
