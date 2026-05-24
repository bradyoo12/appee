---
description: appee pipeline orchestrator — pick an issue, implement, test, PR, merge to main. Loop or single-issue.
allowed-prompts:
  - tool: Bash
    prompt: run gh commands for GitHub operations
  - tool: Bash
    prompt: run git commands
  - tool: Bash
    prompt: run pnpm, turbo, drizzle-kit, playwright commands
  - tool: Bash
    prompt: run echo commands
---

## Mode

Parse `$ARGUMENTS` via [`_lib.md`](b-start/_lib.md)'s `parse_issue_num`.
Accepted forms:

- **No argument / `next`** → **Loop mode** (no arg) or **Next-up mode**
  (`next`): pick top of Ready column per Step 2's queue.
- **`123` / `#123` / `https://github.com/bradyoo12/appee/issues/123`** →
  **Single-issue mode**: process only that issue, then exit. No batch,
  no waiting.

```bash
source <(grep -A 200 '## Constants' .claude/commands/b-start/_lib.md | sed -n '/^```bash$/,/^```$/p' | sed '/^```/d')
# (or paste the helpers + constants inline — _lib.md is the single source)

ISSUE_NUM=$(parse_issue_num "$ARGUMENTS")
# Empty → loop or next-up; non-empty → single-issue
MODE_SINGLE=$([ -n "$ISSUE_NUM" ] && echo "1" || echo "")
```

## Step 0: Initialize

```bash
export WORKER_ID="worker-$(hostname)-$$-$(date +%s)"
mkdir -p .claude
echo "fresh-mode-enabled-at: $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .claude/b-start-fresh-mode
echo "worker-id: $WORKER_ID" >> .claude/b-start-fresh-mode
```

Switch to `bradyoo12` only if not already active (matches `/b-init`):

```bash
CURRENT=$(gh auth status 2>&1 | grep -oE 'account [^ ]+' | head -1 | awk '{print $2}')
if [ "$CURRENT" != "bradyoo12" ]; then
  gh auth switch --user bradyoo12 || { echo "ERROR: bradyoo12 not authenticated"; exit 1; }
fi
```

Read and execute [`b-start/step0-worktree.md`](b-start/step0-worktree.md)
to set up the worktree. **ALL subsequent operations happen inside the
worktree.**

## Step 0b: Deploy Health Gate

Read and execute [`b-start/step0b-ci-gate.md`](b-start/step0b-ci-gate.md).
Confirms main-branch Vercel deploy is green before claiming work. If red,
attempts one auto-fix (typecheck + lint locally). Lenient when no
status reporters configured (Slice 0 reality).

## Batch Commit Mode (Loop mode only)

In loop mode, **batch commit**: each issue commits to a shared
`batch/<timestamp>` branch with no push. Push + single PR happens once no
more Ready issues remain.

```bash
# Batch state (loop mode only — empty in single-issue mode)
BATCH_BRANCH=""
BATCH_ISSUES=()  # "ISSUE_NUM|title" entries
```

**Single-issue mode**: no batch — branch off, commit, push, single-issue
PR, merge.

## Step 1: Load Reference Docs

Read and execute [`b-start/step1-load-and-fetch.md`](b-start/step1-load-and-fetch.md).

Reads in parallel: `.claude/plans/00-project-kickoff.md`, `demo/index.html`,
`docs/decisions/`, `README.md`. Sources [`_lib.md`](b-start/_lib.md) —
constants + GraphQL/CLI helpers. **The @appee project board #29 is
the source of truth** for ticket state.

## Step 2: Audit Tickets

Read and execute [`b-start/step2-audit.md`](b-start/step2-audit.md).

Fetches the board via `fetch_board` + `flatten_board`, classifies each
item (READY / IN_PROGRESS / IN_REVIEW / ON_HOLD / BACKLOG / DONE),
applies kickoff-plan slice-order gate, produces a Ready priority queue
sorted by board position.

## Step 3–5: Deploy-Retry Loop

Steps 3 → 4 → 5 are wrapped in a **deploy-retry loop**. If Step 5
verification (typecheck + lint + smoke + per-issue 성공 기준 + 최종 E2E)
fails after the merge, the merge commit is reverted and the issue is
re-implemented with the previous failure as context. Max 10 attempts.

- **Single-issue mode**: retries one issue
- **Loop mode (batch)**: retries the whole batch — revert + re-implement
  every issue in the batch one by one

```
DEPLOY_RETRY=0
DEPLOY_MAX_RETRIES=10
PREVIOUS_FAILURES=()
MERGE_COMMIT_SHA=""

while DEPLOY_RETRY < DEPLOY_MAX_RETRIES:
  DEPLOY_RETRY += 1
  echo "=== Deploy-Retry Loop: attempt $DEPLOY_RETRY/$DEPLOY_MAX_RETRIES ==="

  # ── Step 3: Implement ──
  Execute b-start/step3-ticket.md

  # ── Step 4: Merge PR ──
  Execute b-start/step4-merge.md
  MERGE_COMMIT_SHA=$(git rev-parse origin/main)

  # ── Step 5: Verify ──
  # 5a-5b-5c-5d-5d2 — typecheck+lint + local smoke + per-issue 성공 기준 + 최종 E2E
  # (local Next.js OR wait-for-vercel → preview URL). Any FAIL triggers revert + retry.
  Execute b-start/step5-review.md

  # ── Outcome ──
  if Step 5 PASS (board status → Done + issue closed):
    echo "✅ Deploy-Retry Loop succeeded (attempt $DEPLOY_RETRY)"
    break  → continue to Step 6

  # Step 5 FAIL → record + revert + retry
  echo "❌ Verification failed (attempt $DEPLOY_RETRY/$DEPLOY_MAX_RETRIES)"

  # 1. Capture failure context
  PREVIOUS_FAILURES+=("attempt $DEPLOY_RETRY: $FAILURE_REASONS")

  # 2. Post a failure COMMENT on each affected issue (re-implement agent
  #    reads `gh issue view --comments` to avoid repeating the same fix)
  for entry in "${BATCH_ISSUES[@]:-$ISSUE_NUM}"; do
    NUM=$(echo "$entry" | cut -d'|' -f1)
    [ -z "$NUM" ] && continue
    gh issue comment "$NUM" --repo "$APPEE_REPO" --body "$(cat <<EOF
> **Deploy-Retry attempt $DEPLOY_RETRY/$DEPLOY_MAX_RETRIES — FAILED ($(date -u +%Y-%m-%dT%H:%M:%SZ))**
>
> typecheck/lint output:
> \`\`\`
> $TYPECHECK_OUTPUT_TAIL
> \`\`\`
>
> smoke output:
> \`\`\`
> $SMOKE_OUTPUT_TAIL
> \`\`\`
>
> Previous approaches tried:
> $(printf -- '- attempt %s\n' "${PREVIOUS_FAILURES[@]}")
>
> **DO NOT repeat the same fix.** Read the errors, find a different
> root cause, take a different approach.
EOF
)"
  done

  if DEPLOY_RETRY >= DEPLOY_MAX_RETRIES:
    echo "=== Deploy-Retry Loop exhausted — marking issue(s) on hold ==="
    for entry in "${BATCH_ISSUES[@]:-$ISSUE_NUM}"; do
      NUM=$(echo "$entry" | cut -d'|' -f1)
      [ -z "$NUM" ] && continue
      mark_on_hold "$NUM" "10 failed deploy attempts. See failure comments."
    done
    break  → continue to Step 6

  # 3. Revert the merge commit
  echo "=== Reverting merge $MERGE_COMMIT_SHA ==="
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
  git revert "$MERGE_COMMIT_SHA" --no-edit -m 1
  git push origin main

  # 4. Reset board status to Ready (so Step 3 re-picks it)
  for entry in "${BATCH_ISSUES[@]:-$ISSUE_NUM}"; do
    NUM=$(echo "$entry" | cut -d'|' -f1)
    [ -z "$NUM" ] && continue
    move_issue_to_status "$NUM" "$STATUS_READY"
  done

  # 5. Reset worktree to revert head
  git fetch origin main
  git reset --hard origin/main

  # → top of loop: Step 3 re-runs with PREVIOUS_FAILURES context (read via gh issue view --comments)
```

### Passing PREVIOUS_FAILURES to Step 3

On retry (DEPLOY_RETRY > 1), Step 3 reads the failure notes posted as
**issue comments** during the previous iteration. The implementer agent
**must** run `gh issue view <NUM> --comments` before starting — the
failure context is already there, no separate prompt parameter needed.

---

## Step 3: Implement ONE issue

Read and execute [`b-start/step3-ticket.md`](b-start/step3-ticket.md).

- **Single-issue mode**: skip the Ready-set scan. Directly claim and
  implement `$ISSUE_NUM`. If the board status isn't `Ready`, flip it
  (and warn — out-of-order work bends the kickoff-plan slice order).
- **Loop mode (batch)**:
  1. **Batch branch creation** (if not yet created):
     ```bash
     git fetch origin && git checkout --detach origin/main
     BATCH_BRANCH="batch/$(date +%Y%m%d-%H%M%S)"
     git checkout -b "$BATCH_BRANCH"
     ```
  2. If no Ready issues: run **Step 5b (triage)** once, then wait in a
     60s polling loop. Stop signal is the only exit.
  3. If Ready issues exist: claim the top one, implement, **commit
     only — no push, no PR**.
  4. Append to `BATCH_ISSUES+=("$ISSUE_NUM|$T_TITLE")`.

**CRITICAL — NEVER EXIT ON EMPTY BOARD**: even with 0 Ready issues,
do NOT terminate. Sit in the polling loop until stop signal fires. "No
work to do" is not an exit condition.

## Step 3.5: Batch Check (Loop mode only)

After each issue implementation, re-audit the board:

```bash
BOARD_FLAT=$(fetch_board | flatten_board "$(cat)")
READY_COUNT=$(echo "$BOARD_FLAT" | awk -F'\t' '$3 == "OPEN" && $4 == "Ready" && index($5, "on hold") == 0 { print }' | wc -l)
```

- **Ready > 0**: → back to **Step 3** for the next issue (commit
  accumulates on the same batch branch)
- **Ready == 0**: → **Step 3.7 (Batch Push)**

## Step 3.7: Batch Push & PR (Loop mode only)

Push the accumulated commits and open a single PR with one `Closes #N`
line per batched issue (GitHub auto-closes each on merge):

1. **Push**:
   ```bash
   git push -u origin "$BATCH_BRANCH"
   ```

2. **PR**:
   ```bash
   CLOSES_LINES=""
   ISSUE_LIST=""
   for entry in "${BATCH_ISSUES[@]}"; do
     NUM=$(echo "$entry" | cut -d'|' -f1)
     TITLE=$(echo "$entry" | cut -d'|' -f2)
     CLOSES_LINES+="Closes #${NUM}"$'\n'
     ISSUE_LIST+="- #${NUM}: ${TITLE}"$'\n'
   done

   BATCH_IDS=$(printf '%s\n' "${BATCH_ISSUES[@]}" | cut -d'|' -f1 | sed 's/^/#/' | tr '\n' ',' | sed 's/,$//; s/,/, /g')

   PR_URL=$(gh pr create --base main --head "$BATCH_BRANCH" \
     --title "batch: ${BATCH_IDS}" \
     --body "$(cat <<EOF
## Summary

### Issues
${ISSUE_LIST}

${CLOSES_LINES}
## Test plan
- [x] \`pnpm typecheck\` passed locally
- [x] \`pnpm lint\` passed locally
- [x] Smoke check against local Next.js dev

🤖 Generated by /b-start batch mode
EOF
)")
   BATCH_PR_NUMBER=$(echo "$PR_URL" | grep -oE '/pull/[0-9]+' | grep -oE '[0-9]+')
   ```

3. `BATCH_PR_NUMBER` → used by Step 4.

## Step 4: Merge PR

Read and execute [`b-start/step4-merge.md`](b-start/step4-merge.md).

**Loop mode batch**: merge the batch PR created in Step 3.7. After merge,
flip every `BATCH_ISSUES` entry's board status to `In review`.

## Step 5: Review + Close

Read and execute [`b-start/step5-review.md`](b-start/step5-review.md).

Verifies:

1. `pnpm typecheck && pnpm lint` green (+ `pnpm test` when that script
   lands in apps/console)
2. Smoke: bring up `pnpm dev` locally, hit `/` (and `/api/health` if
   exists)
3. Per-issue 성공 기준 from the issue body (`검증 명령` lines from
   /create-ticket Step 4)
4. **최종 E2E 검증** (5d2): parse `## 최종 E2E 검증` from each issue
   body, run against `local` (Next.js dev) or `vercel-preview` (wait
   for Vercel deploy on the merge SHA, extract preview URL from commit
   status). Missing-block issues are warned + skipped (forward compat);
   explicit `생략 — 사유:` is honored.

**CRITICAL**: Step 5 MUST move each issue from `In review` → `Done`
(board status) AND close the GitHub issue. Do NOT leave issues in
`In review` indefinitely. Order:

1. Run typecheck + lint + smoke
2. Verify each issue's 성공 기준
3. All pass → board status `Done` + `gh issue close` (idempotent if
   PR's `Closes #N` already fired)
4. Post a `> **Done (...)**` comment with the merge SHA on each issue

**Fallback**: if a board item lingers in `In review`, force-finalize
before continuing — Step 5's `5f` block handles this.

## Step 5b: Triage

Stub issues (one-liner enhancement requests created outside
`/create-ticket`) can land in Backlog or Ready without complete
성공 기준 / 구현 가이드. If any exist in Ready, surface them for
enrichment via `/create-ticket` (issue body update + re-add labels) —
don't pick them up for implementation until they have the full
structure.

**When**: after Step 5, and once when entering the Step 3 wait loop (so
a freshly-emptied board doesn't sit idle when there's enrichment work
queued).

## Step 6: Continue or Exit

Read and execute [`b-start/step6-report.md`](b-start/step6-report.md).

**Single-issue mode**: issue is done (or on hold after 10 retries).
**Exit immediately** — no loop, no waiting.

**Loop mode**: check stop signals:

```bash
if [ -f .claude/b-start-stop-signal ]; then
  echo "=== Stop signal detected — exiting ==="
  rm -f .claude/b-start-stop-signal .claude/b-start-fresh-mode
  exit 0
fi
if [ ! -f .claude/b-start-fresh-mode ]; then
  echo "=== Fresh-mode flag removed — exiting ==="
  exit 0
fi
```

**Reset batch state** for the next cycle:

```bash
BATCH_BRANCH=""
BATCH_ISSUES=()
```

If no stop signal, **immediately loop back to Step 2** and process the
next batch. Do NOT spawn a new Claude session — continue in the same one.

**IMPORTANT**: Step 2 returning an empty Ready set is NOT a termination
condition — Step 3's wait loop handles that case.

## Key Rules

- **Autonomous** — no permission prompts (`allowed-prompts` frontmatter
  pre-authorizes git/gh/pnpm/turbo)
- **Single-issue mode** — `/b-start 14`, `/b-start #14`, or
  `/b-start https://github.com/bradyoo12/appee/issues/14`: process
  only that issue, then exit. No batch, no triage, no looping.
- **Deploy-Retry Loop** — loop + single both. Step 5 failure → revert
  merge → re-implement with `PREVIOUS_FAILURES` context (read via
  `gh issue view --comments`). Max 10 attempts. No "same-PR fix" —
  every retry is a fresh implementation.
- **Loop mode** — `/b-start` (no args) or `/b-start next`: issues
  processed continuously, loops back to Step 2 after each batch.
- **Worktree required** — never run in the main checkout. Worktree is
  set up in Step 0 and cleaned up on exit. Slot-local `node_modules`
  per worktree (pnpm symlinks, cheap).
- **PR body** — `Closes #N` (one line per issue for batch). GitHub
  auto-closes the issue on merge.
- **Slice order matters** — Step 2 audit refuses to surface a Ready
  item that jumps the kickoff-plan slice order. Single-ticket mode
  overrides with warning.
- **Board-based state** — the **@appee project board #29** Status
  field + GitHub Issue open/closed state are the source of truth.
  No file ticket index.
- **demo compliance** — Step 3 implementer checks user-facing flows
  against [demo/index.html](../../demo/index.html) (memory
  `feedback_demo_compliance.md`).
- **Minimum implementation** — Step 3 honors memory
  `feedback_minimal_implementation.md`: 가장 작은 한 조각만. Don't
  expand scope beyond the issue.
- **Batch commit (loop mode)** — each issue commits-only, push + PR
  fires once Ready is empty. Single batch branch, single PR per cycle.
- **Stop** (loop mode only): `/b-start-end` or delete
  `.claude/b-start-fresh-mode`.

## Compatibility note (Slice 0 reality)

Some of the verification surface area is **placeholder until appee
catches up**:

- No `apps/console` test script yet → 5b uses typecheck+lint only.
  When `pnpm --filter @appee/console test` lands, append it.
- No `/api/health` endpoint yet → 5c probes `/`. Switch to `/api/health`
  when added.
- No `.github/workflows/ci.yml` yet → 0b is lenient. When CI lands,
  switch to querying `ci.yml` runs like memoria does.
- Vercel preview URL extraction depends on Vercel posting GitHub commit
  statuses. If unwired, 5d2's `vercel-preview` branch will time out;
  use `local` as default in `/create-ticket` until verified.
