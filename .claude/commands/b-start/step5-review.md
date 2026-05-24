# Step 5: Review + Verify + Close

After merge, verify each issue's 성공 기준 actually holds on
origin/main, then run `## 최종 E2E 검증` against `local` (Next.js dev)
or `vercel-preview` (after the Vercel deploy finishes for the merge
SHA). If any step fails, the outer retry loop in `b-start.md` will
revert the merge and re-implement.

Sub-steps:

- **5a** — pull merged `main`
- **5b** — `pnpm typecheck && pnpm lint` (Slice 0 has no test suite yet;
  add `pnpm test` when it lands)
- **5c** — local Next.js dev smoke (root + `/api/health` if exists).
  Brings dev server up; leaves it running for 5d2's `local` branch
- **5d** — per-issue `## 성공 기준` (`검증 명령` lines from issue body)
- **5d2** — per-issue `## 최종 E2E 검증` (local-dev or wait-for-vercel
  → preview URL)
- **5d-cleanup** — tear down local Next.js dev (idempotent; called by
  every exit path)
- **5e** — mark Done (board + close + comment)

`_lib.md` helpers used here: `issue_body`, `issue_to_item_id`,
`set_item_status`, `mark_on_hold`.

## 5a: Pull merged main into worktree

```bash
git fetch origin main
git checkout main 2>/dev/null || git checkout --detach origin/main
git pull --ff-only origin main

# Re-install if pnpm-lock changed in the merge
pnpm install --frozen-lockfile
```

## 5b: typecheck + lint (+ test when available)

```bash
pnpm typecheck
TYPECHECK_EXIT=$?
pnpm lint
LINT_EXIT=$?

# If apps/console/package.json has a test script in the future:
# pnpm --filter @appee/console test --run
# TEST_EXIT=$?

TYPECHECK_OUTPUT_TAIL=$(pnpm typecheck 2>&1 | tail -50)
```

If `TYPECHECK_EXIT != 0` or `LINT_EXIT != 0` → FAIL. Skip remaining
sub-steps, return to `b-start.md`'s retry loop with `FAILURE_REASONS`
populated.

## 5c: Smoke against local Next.js dev

appee's "smoke test" hits the local Next.js console root + any health
endpoint defined for the slice.

> **Lifecycle note**: 5c brings `pnpm dev` up and **leaves it running**
> so 5d2's `local` branch can reuse it. Teardown happens in **5d-cleanup**,
> which 5e and every failure path call before returning.

1. Bring up Next.js dev in the background on the slot-unique port set by
   [`step0-worktree.md`](step0-worktree.md) (`$LOCAL_PORT`, `$LOCAL_BASE_URL`):

   ```bash
   cd "$WORKTREE_DIR"
   nohup pnpm --filter @appee/console dev -- --port "$LOCAL_PORT" \
     > "$WORKTREE_DIR/.b-start-smoke.log" 2>&1 &
   DEV_PID=$!

   # Wait up to 30s for the server to come up
   for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
     curl -sf "$LOCAL_BASE_URL/" > /dev/null && break
     sleep 2
   done
   ```

2. Exercise a minimal probe — Slice 0 may not have `/api/health` yet,
   so root `/` is the universal probe. If a slice adds `/api/health`,
   prefer that:

   ```bash
   if ! curl -sf "$LOCAL_BASE_URL/" > /dev/null; then
     SMOKE_OUTPUT_TAIL=$(tail -50 "$WORKTREE_DIR/.b-start-smoke.log")
     # run 5d-cleanup then FAIL
   fi

   # Optional: if /api/health exists, probe it too
   curl -sf "$LOCAL_BASE_URL/api/health" > /dev/null 2>&1 || true
   ```

   > **Don't tear down dev here** on success — 5d2 needs it. Teardown is
   > 5d-cleanup's job.

## 5d: Per-issue 성공 기준

For every issue in `BATCH_ISSUES` (or just `$ISSUE_NUM`), fetch the body
and extract each 성공 기준 entry's `검증 명령` line. Execute and judge
by the listed `통과 기준`:

```bash
verify_issue() {
  local issue_num="$1"
  local body
  body=$(issue_body "$issue_num")
  # Extract each `검증 명령` line under `## 성공 기준`
  echo "$body" | awk '
    /^## 성공 기준/ { in_sc=1; next }
    /^## / && in_sc { exit }
    in_sc && /검증 명령/ { print }
  '
  # Execute each and record exit code — implementer logic
}

if [ -z "$BATCH_BRANCH" ]; then
  verify_issue "$ISSUE_NUM"
else
  for entry in "${BATCH_ISSUES[@]}"; do
    NUM=$(echo "$entry" | cut -d'|' -f1)
    verify_issue "$NUM"
  done
fi
```

If any 성공 기준 fails → run **5d-cleanup** then FAIL with
`FAILURE_REASONS` set to which issue + which SC + the command output.

## 5d2: 최종 E2E 검증

Parse the `## 최종 E2E 검증` block from each issue body and execute its
`검증 명령` against `local` (Next.js dev from 5c) or `vercel-preview`
(after Vercel deploy finishes for `$MERGE_COMMIT_SHA`).

### Parser

For each issue, extract the 4 fields from the `## 최종 E2E 검증`
heading block:

```bash
parse_e2e_block() {
  local issue_num="$1"
  local body
  body=$(issue_body "$issue_num")

  # Slice from `## 최종 E2E 검증` to next `## ` heading
  local block
  block=$(echo "$body" | awk '
    /^## 최종 E2E 검증/ { capture=1; next }
    /^## / && capture { exit }
    capture { print }
  ')

  if [ -z "$block" ]; then
    echo "MISSING"
    return 0
  fi
  if echo "$block" | grep -qE '^생략 — 사유:'; then
    echo "SKIP"
    return 0
  fi

  local loc cmd expect what
  loc=$(echo "$block"    | grep -oP '검증 위치\*\*:\s*`?\K[^`\s]+' | head -1)
  cmd=$(echo "$block"    | sed -n 's/^- \*\*검증 명령\*\*:\s*//p' | head -1 | sed 's/^`//; s/`$//')
  expect=$(echo "$block" | sed -n 's/^- \*\*통과 기준\*\*:\s*//p' | head -1)
  what=$(echo "$block"   | sed -n 's/^- \*\*검증 대상\*\*:\s*//p' | head -1)

  # TSV: loc<TAB>cmd<TAB>expect<TAB>what
  printf '%s\t%s\t%s\t%s\n' "$loc" "$cmd" "$expect" "$what"
}
```

### 5d2-a: Classify issues

```bash
LOCAL_ISSUES=()           # "ISSUE_NUM|cmd|expect|what"
VERCEL_PREVIEW_ISSUES=()
MISSING_ISSUES=()

for entry in "${BATCH_ISSUES[@]:-$ISSUE_NUM}"; do
  NUM=$(echo "$entry" | cut -d'|' -f1)
  [ -z "$NUM" ] && continue
  parsed=$(parse_e2e_block "$NUM")
  case "$parsed" in
    MISSING)
      MISSING_ISSUES+=("$NUM")
      ;;
    SKIP)
      echo "5d2: #$NUM — 생략 (issue body declared skip)"
      ;;
    *)
      loc=$(echo "$parsed" | cut -f1)
      rest=$(echo "$parsed" | cut -f2-)
      if [ "$loc" = "vercel-preview" ] || [ "$loc" = "staging" ]; then
        VERCEL_PREVIEW_ISSUES+=("$NUM|$rest")
      else
        LOCAL_ISSUES+=("$NUM|$rest")
      fi
      ;;
  esac
done
```

**Missing-block handling**: legacy issues created before this section
existed have no `## 최종 E2E 검증` block. Treat as **warning + skip**,
not fail (forward-compat). Post a comment so the user knows to backfill:

```bash
for NUM in "${MISSING_ISSUES[@]}"; do
  gh issue comment "$NUM" --repo "$APPEE_REPO" \
    --body "> **5d2 skipped** — issue body missing \`## 최종 E2E 검증\` block. New tickets via /create-ticket include this; backfill if you want deploy-time acceptance coverage."
done
```

### 5d2-b: Run local E2E (Next.js dev already up from 5c)

```bash
run_e2e_cmd() {
  local issue_num="$1" cmd="$2" base_url="$3"
  # The issue's 검증 명령 references $BASE_URL as escape hatch.
  # Substitute and execute via bash -c so quoting in the command survives.
  BASE_URL="$base_url" bash -c "$cmd"
}

LOCAL_E2E_FAILS=()
for entry in "${LOCAL_ISSUES[@]}"; do
  NUM=$(echo "$entry" | cut -d'|' -f1)
  CMD=$(echo "$entry" | cut -d'|' -f2)
  EXPECT=$(echo "$entry" | cut -d'|' -f3)
  echo "5d2 local: #$NUM — $CMD"
  if ! OUTPUT=$(run_e2e_cmd "$NUM" "$CMD" "$LOCAL_BASE_URL" 2>&1); then
    LOCAL_E2E_FAILS+=("#$NUM: cmd exited non-zero. expect=$EXPECT. out=$(echo "$OUTPUT" | tail -10)")
  fi
done
```

### 5d2-c: Wait for Vercel preview deploy + run preview E2E

Vercel auto-deploys on every push to main and reports back via GitHub
commit statuses. We wait for the deployment whose target ref is our
`MERGE_COMMIT_SHA` and extract its preview URL:

```bash
VERCEL_E2E_FAILS=()
if [ ${#VERCEL_PREVIEW_ISSUES[@]} -gt 0 ]; then
  # Poll the commit's deployment status. Vercel posts a deployment_status
  # event whose `target_url` is the preview URL.
  PREVIEW_URL=""
  DEPLOY_STATE=""
  for i in $(seq 1 60); do
    RESP=$(gh api "repos/${APPEE_REPO}/commits/${MERGE_COMMIT_SHA}/status" 2>/dev/null)
    DEPLOY_STATE=$(echo "$RESP" | jq -r '.state')
    # Find the Vercel status entry (context contains "vercel")
    PREVIEW_URL=$(echo "$RESP" | jq -r '.statuses[] | select(.context | test("vercel"; "i")) | .target_url' | head -1)
    if [ "$DEPLOY_STATE" = "success" ] && [ -n "$PREVIEW_URL" ]; then
      break
    fi
    if [ "$DEPLOY_STATE" = "failure" ] || [ "$DEPLOY_STATE" = "error" ]; then
      break
    fi
    sleep 10
  done

  if [ "$DEPLOY_STATE" != "success" ]; then
    VERCEL_E2E_FAILS+=("vercel_deploy_state=$DEPLOY_STATE for $MERGE_COMMIT_SHA after 10min. preview_url=$PREVIEW_URL")
  elif [ -z "$PREVIEW_URL" ]; then
    VERCEL_E2E_FAILS+=("vercel_deploy_url_missing: success state but no Vercel target_url for $MERGE_COMMIT_SHA")
  else
    # Health probe before running issue commands
    for i in $(seq 1 12); do
      curl -sf "$PREVIEW_URL/" > /dev/null && break
      sleep 5
    done

    if ! curl -sf "$PREVIEW_URL/" > /dev/null; then
      VERCEL_E2E_FAILS+=("preview_health_fail: $PREVIEW_URL/ not responding 60s after deploy")
    else
      for entry in "${VERCEL_PREVIEW_ISSUES[@]}"; do
        NUM=$(echo "$entry" | cut -d'|' -f1)
        CMD=$(echo "$entry" | cut -d'|' -f2)
        EXPECT=$(echo "$entry" | cut -d'|' -f3)
        echo "5d2 vercel-preview: #$NUM — $CMD"
        if ! OUTPUT=$(run_e2e_cmd "$NUM" "$CMD" "$PREVIEW_URL" 2>&1); then
          VERCEL_E2E_FAILS+=("#$NUM: cmd exited non-zero. expect=$EXPECT. out=$(echo "$OUTPUT" | tail -10)")
        fi
      done
    fi
  fi
fi
```

### 5d2-d: Aggregate verdict

```bash
ALL_E2E_FAILS=("${LOCAL_E2E_FAILS[@]}" "${VERCEL_E2E_FAILS[@]}")
if [ ${#ALL_E2E_FAILS[@]} -gt 0 ]; then
  FAILURE_REASONS="e2e_fail: $(printf '%s | ' "${ALL_E2E_FAILS[@]}")"
  echo "5d2 FAILED: $FAILURE_REASONS"
  # Run cleanup before returning so dev server doesn't leak across retries
fi
```

Any failure (deploy timeout, deploy red, health fail, command red) →
run **5d-cleanup** then return 1 to `b-start.md`'s deploy-retry loop.
The retry loop will revert the merge and re-implement.

> **Pure-deploy-infra failures** (Vercel outage, build cache corruption)
> will cause spurious revert + retry. After 10 attempts the on-hold
> label fires and a human intervenes. That's the right escape hatch —
> don't add a heuristic to distinguish "real bug" from "Vercel
> flapping".

## 5d-cleanup: Tear down local Next.js dev

Called by 5c (on FAIL), 5d (on FAIL), 5d2 (on FAIL or success), and 5e
(on success before marking Done). Idempotent.

```bash
cleanup_local_dev() {
  if [ -n "${DEV_PID:-}" ]; then
    # Windows: taskkill; POSIX: kill -9. Try both, swallow errors.
    taskkill.exe //PID "$DEV_PID" //F //T 2>/dev/null \
      || kill -9 "$DEV_PID" 2>/dev/null \
      || true
    unset DEV_PID
  fi
  # Also kill any straggler node processes bound to $LOCAL_PORT
  # (Next.js dev sometimes spawns child workers)
  if [ -n "${LOCAL_PORT:-}" ]; then
    if command -v netstat >/dev/null 2>&1; then
      PIDS=$(netstat -ano 2>/dev/null | grep ":${LOCAL_PORT}" | grep LISTENING | awk '{print $NF}' | sort -u)
      for P in $PIDS; do
        taskkill.exe //PID "$P" //F //T 2>/dev/null || kill -9 "$P" 2>/dev/null || true
      done
    fi
  fi
}
cleanup_local_dev
```

> Multi-slot note: each worker's dev server binds to `$LOCAL_PORT`
> (slot-unique, 3000+slot-1), so one worker's cleanup never kills
> another worker's process.

## 5e: Mark Done

For every issue that passed all of 5b/5c/5d/5d2:

1. **Board status → Done**:
   ```bash
   finalize_issue() {
     local issue_num="$1"
     local item_id
     item_id=$(issue_to_item_id "$issue_num")
     [ -n "$item_id" ] && set_item_status "$item_id" "$STATUS_DONE"

     # Idempotent close — the PR's Closes #N may have already done this
     gh issue close "$issue_num" --repo "$APPEE_REPO" 2>/dev/null || true

     # Audit-trail comment with the merge SHA
     gh issue comment "$issue_num" --repo "$APPEE_REPO" \
       --body "> **Done (`date -u +%Y-%m-%dT%H:%M:%SZ`)** — merge SHA \`${MERGE_COMMIT_SHA:0:12}\`. Verified: typecheck green · lint green · smoke green · 성공 기준 PASS · 최종 E2E PASS."
   }

   if [ -z "$BATCH_BRANCH" ]; then
     finalize_issue "$ISSUE_NUM"
   else
     for entry in "${BATCH_ISSUES[@]}"; do
       NUM=$(echo "$entry" | cut -d'|' -f1)
       finalize_issue "$NUM"
     done
   fi
   ```

2. **No file commits needed** — the board + issue state on GitHub is
   the complete record.

## 5f: Force-finalize fallback

If for any reason an issue lingers in `In review` after Step 5:

```bash
# b-start.md outer loop calls this after Step 5 returns
for entry in "${BATCH_ISSUES[@]}"; do
  NUM=$(echo "$entry" | cut -d'|' -f1)
  STATUS=$(fetch_board | flatten_board "$(cat)" | awk -F'\t' -v n="$NUM" '$2 == n { print $4 }')
  if [ "$STATUS" = "In review" ]; then
    finalize_issue "$NUM"
  fi
done
```

## On-hold after 10 deploy-retry failures

`b-start.md`'s outer retry loop triggers on-hold:

```bash
mark_on_hold "$ISSUE_NUM" "10 failed deploy attempts. See latest failure comment."
ITEM_ID=$(issue_to_item_id "$ISSUE_NUM")
# Keep board status as In progress — on-hold label is the signal,
# not the status field. Step 2 audit treats label as the override.
```

## Failure handling

Return a structured failure to `b-start.md`'s retry loop. **Always call
`cleanup_local_dev` first** (5d-cleanup) — never `return 1` with a
live Next.js process leaked.

```bash
cleanup_local_dev
FAILURE_REASONS="typecheck_fail: <tail> | lint_fail: <tail> | smoke_fail: <tail> | acceptance_fail: #<NUM>:<SC> | e2e_fail: <5d2 details>"
TYPECHECK_OUTPUT_TAIL="..."
SMOKE_OUTPUT_TAIL="..."
return 1  # → triggers revert + retry
```

The retry loop will:

1. Append the failure details as a **comment** on each affected issue.
2. Revert the merge commit.
3. Reset each affected issue's board status back to **Ready**.
4. Re-enter Step 3 with the new failure context available to the
   implementer via `gh issue view --comments`.

→ On success, continue to Step 5b (triage) then Step 6.
