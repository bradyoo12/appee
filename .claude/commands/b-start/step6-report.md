# Step 6: Report + Loop or Exit

End-of-cycle bookkeeping: emit a status report, check stop signals,
either loop back or clean up + exit.

`_lib.md` helpers used here: `fetch_board`, `flatten_board`.

## 6a: Report

Print a short summary of what this cycle did:

```
=== Cycle complete ===
Mode: loop | single (#<NUM>)
Issues shipped: #<NUM>, #<MMM>
PR: #<n> merged (squash SHA: <short-sha>)
Verification: typecheck green | lint green | smoke green | 성공 기준 OK
```

Loop mode also prints the audit counts (same format as Step 2, re-fetched
from the board):

```bash
BOARD_FLAT=$(fetch_board | flatten_board "$(cat)")
ready=$(echo "$BOARD_FLAT" | awk -F'\t' '$3 == "OPEN" && $4 == "Ready" && index($5, "on hold") == 0 { print }' | wc -l)
in_progress=$(echo "$BOARD_FLAT" | awk -F'\t' '$3 == "OPEN" && $4 == "In progress" { print }' | wc -l)
in_review=$(echo "$BOARD_FLAT" | awk -F'\t' '$3 == "OPEN" && $4 == "In review" { print }' | wc -l)
on_hold=$(echo "$BOARD_FLAT" | awk -F'\t' 'index($5, "on hold") > 0 { print }' | wc -l)
backlog=$(echo "$BOARD_FLAT" | awk -F'\t' '$3 == "OPEN" && $4 == "Backlog" { print }' | wc -l)
done=$(echo "$BOARD_FLAT" | awk -F'\t' '$3 == "CLOSED" || $4 == "Done" { print }' | wc -l)
```

```
Board: https://github.com/users/bradyoo12/projects/29/views/1
READY: $ready        → next: #<NUM or "—">
IN_PROGRESS: $in_progress
IN_REVIEW: $in_review
ON_HOLD: $on_hold
BACKLOG: $backlog
DONE: $done
```

## 6b: Single-ticket completion report (single-ticket mode)

In single-ticket mode, emit the user-facing handoff report **in Korean**.
Format:

```markdown
## 최종 결과

| 단계 | 결과 |
|------|------|
| 이슈 | #<NUM> — done (또는 on hold) |
| PR | #<n> — merged (squash SHA `<short-sha>`) |
| 보드 | @appee #29 → Done |
| 검증 | typecheck <PASS/FAIL> · lint <PASS/FAIL> · smoke <PASS/FAIL> · 성공 기준 <N/N PASS> |
| Deploy-Retry | <attempt-count>/10 |

## 변경 요약
- <파일:라인 또는 함수명> — <1줄 설명>
- <필요 시 추가 bullet>

## 남은 사람 작업 (해당 시)
- <외부 SaaS, 비밀값, prod DB 등 자동화 불가 항목>
```

Trigger "남은 사람 작업" section ONLY when:

- A 성공 기준 required external action (Stripe / Supabase prod /
  Vercel env / EAS / DNS / Apple/Google store)
- A secret/credential needed for the test was unavailable locally
- The issue asked for human visual verification on a physical phone
  (Expo 산출물 빌드 등 — QR 스캔 후 폰에서 확인 필요한 경우)

Skip the section entirely if there's nothing to hand off.

## 6c: Stop signal check (loop mode only)

```bash
if [ -f .claude/b-start-stop-signal ]; then
  echo "=== Stop signal detected — exiting ==="
  rm -f .claude/b-start-stop-signal .claude/b-start-fresh-mode

  cd "$MAIN_REPO"
  git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true
  exit 0
fi

if [ ! -f .claude/b-start-fresh-mode ]; then
  echo "=== Fresh-mode flag missing — exiting (clean shutdown) ==="
  cd "$MAIN_REPO"
  git worktree remove "$WORKTREE_DIR" --force 2>/dev/null || true
  exit 0
fi
```

## 6d: Reset batch state + loop back

Reset for the next cycle:

```bash
BATCH_BRANCH=""
BATCH_ISSUES=()
PREVIOUS_FAILURES=()
DEPLOY_RETRY=0
MERGE_COMMIT_SHA=""
```

Then **loop back to Step 2** (re-audit, since board state changed).
Don't spawn a new Claude session — continue in the same one.

## What this step does NOT do

- Spawn a new Claude session — continue within the same session
- Treat "0 Ready issues" as a termination condition — Step 3's wait
  loop owns that case
- Cleanup commits or rewrite git history — bookkeeping happens via
  Step 5's issue comments + board status moves, all on GitHub
