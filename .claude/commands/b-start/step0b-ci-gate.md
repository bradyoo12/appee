# Step 0b: CI / Deploy Health Gate

Confirm `main` branch is in a healthy deployed state before claiming new
work. If main's last Vercel deploy or CI workflow is red, any merge we
do compounds the failure.

## Current appee state (2026-05)

appee doesn't have `.github/workflows/ci.yml` yet (Slice 0 단계). This
step is therefore **lenient**: it checks the last Vercel deploy on main
via `gh api`, and falls back to a "skip" if nothing is set up.

When CI lands later, switch the check to query `ci.yml` runs just like
memoria's b-start does.

## Steps

1. Check the most recent push to main has a successful Vercel deploy
   (Vercel reports deployment status as a GitHub commit status):

   ```bash
   LAST_MAIN_SHA=$(git rev-parse origin/main)
   STATUSES=$(gh api "repos/${APPEE_REPO}/commits/${LAST_MAIN_SHA}/status" \
     --jq '.state' 2>/dev/null || echo "unknown")
   # state: success | pending | failure | error | unknown
   ```

2. Interpret:
   - `success` → **green**, proceed
   - `pending` → **wait** — poll every 30s up to 10 minutes. After 10min
     abort the cycle (don't stack work behind unknown deploy state).
   - `failure` / `error` → **red**, attempt auto-fix (see step 3)
   - `unknown` → no status reporters configured yet (eg. Vercel not
     wired up). Log a warning and proceed. Don't block on missing infra.

3. **Auto-fix attempt** (red only — max one try):
   - Pull the latest main into the worktree:
     `git fetch origin main && git reset --hard origin/main`
   - Run a quick local sanity check:
     ```bash
     pnpm install --frozen-lockfile
     pnpm typecheck
     pnpm lint
     ```
   - If those pass locally, the failure is likely Vercel-side (env var,
     build cache, etc.) — abort the cycle and surface the failure URL.
     Don't try to fix Vercel infra automatically.
   - If typecheck/lint fails locally, attempt a fix using the failure
     output as context. Commit + push + open a `fix(ci):` PR + merge
     once green.
   - If still red after one auto-fix attempt → abort, write reason to
     `.claude/b-start-fresh-mode` log, exit with non-zero.

## What this does NOT do

- Bypass red deploys by reverting commits without investigation
- Use `--no-verify` to push past pre-push hooks
- Merge with `--admin` to bypass branch protection
- Try to "fix" Vercel infrastructure issues automatically

→ Continue to Step 1.
