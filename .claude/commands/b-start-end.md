---
description: Signal a running /b-start loop to finish its current cycle and exit gracefully.
---

Creates a stop signal file that a running `/b-start` loop will detect at
the end of each cycle. Does NOT process tickets, merge PRs, or modify
state — only signals.

## Usage

`/b-start-end`

## How it works

```
┌─────────────────────────────────────────────────────────┐
│              /b-start-end (Stop Signal)                  │
├─────────────────────────────────────────────────────────┤
│  1. Write .claude/b-start-stop-signal                    │
│  2. Log confirmation                                     │
│  3. Done — running /b-start will finish current cycle    │
│     and exit instead of picking the next ticket          │
└─────────────────────────────────────────────────────────┘
```

## Steps

### 1. Write stop signal

```bash
mkdir -p .claude
echo "stop-requested-at: $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .claude/b-start-stop-signal
```

### 2. Confirm

Print (Korean):

> Stop signal 작성 완료. 실행 중인 `/b-start` 루프는 현재 사이클을 마저
> 끝낸 뒤 종료합니다. **새 티켓을 잡지는 않습니다.**

## What this command MUST NOT do

- Scan or modify any issue / project board state
- Merge PRs, revert merges, or push to origin
- Add `on hold` to any ticket — `/b-start`'s deploy-retry loop owns
  that decision (after 10 retry failures)
- Clean up branches or worktrees — `/b-start`'s Step 6 owns cleanup
- Run `pnpm typecheck`, `pnpm dev`, or any verification

All of the above belongs to `/b-start`. This command is **signal-only**.

## Edge cases

- **No `/b-start` running**: the signal file persists. Next `/b-start`
  invocation deletes it during Step 0 init before doing anything else.
- **Worktree was force-removed externally**: signal still works — the
  loop sees the signal file in the main repo's `.claude/` (loop runs
  from the worktree but the path resolves to the same `.claude/`
  thanks to shared `.git`).
- **`/b-start` is mid-implementation (Step 3)**: the signal is checked
  only in Step 6 (end of cycle). So the in-flight ticket finishes
  through Step 5 first, then the loop exits cleanly. This is intentional
  — abrupt mid-ticket termination would leave Status in a half-state.

## Related

- [b-start.md](b-start.md) — the orchestrator that reads this signal
- [b-start/step6-report.md](b-start/step6-report.md) — exact signal-check logic
