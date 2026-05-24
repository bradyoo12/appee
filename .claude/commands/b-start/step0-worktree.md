# Step 0: Worktree Setup

appee b-start may be invoked from multiple tabs simultaneously, so the
worktree slot must support concurrent claims. The pattern below uses
atomic `git worktree add` failure as the lock primitive.

## Steps

1. Prune stale worktree entries (cheap — removes refs to directories that
   no longer exist on disk; does NOT touch live worktrees):

   ```bash
   git worktree prune
   ```

2. Fetch latest origin:

   ```bash
   git fetch origin
   ```

3. **Atomic slot claim** — try slots `appee-worker-1` through `-8`,
   first one where `git worktree add` succeeds is ours:

   ```bash
   MAIN_REPO="$(pwd)"
   WORKTREE_DIR=""
   SLOT_N=""
   for N in 1 2 3 4 5 6 7 8; do
     CANDIDATE="$(cd .. && pwd)/appee-worker-$N"
     # git worktree add fails atomically if CANDIDATE is already a live
     # worktree. stderr suppressed; on failure we try the next N.
     if git worktree add --detach "$CANDIDATE" origin/main 2>/dev/null; then
       WORKTREE_DIR="$CANDIDATE"
       SLOT_N=$N
       break
     fi
   done
   if [ -z "$WORKTREE_DIR" ]; then
     echo "ERROR: worktree slots 1~8 all in use. Wait for a worker to finish, or run 'git worktree prune && git worktree list' to clear stale entries." >&2
     exit 1
   fi
   echo "Claimed slot $SLOT_N: $WORKTREE_DIR"
   ```

   Critical: **never `git worktree remove --force`** another worker's
   slot here. Two concurrent b-start invocations would each force-remove
   the other's slot, losing both workers' uncommitted edits. The atomic
   `git worktree add` failure path is the correct lock.

4. Record `MAIN_REPO`, `WORKTREE_DIR`, and `SLOT_N` as env vars. **ALL
   subsequent operations happen in `$WORKTREE_DIR`.** Step 6 cleanup
   removes only this specific slot.

5. **Slot-local `node_modules`** — required, not optional. pnpm install
   in a worktree creates symlinks into the global content-addressable
   store, so the cost is small (~5–15s for cached deps). Each
   worktree's `node_modules` is independent so two slots can be on
   branches with different `pnpm-lock.yaml` without stomping each other.

   ```bash
   cd "$WORKTREE_DIR"
   if [ ! -d "node_modules" ]; then
     pnpm install --frozen-lockfile
   fi
   ```

   First-time slot creation pays the install cost; subsequent claims of
   the same slot reuse the existing `node_modules` (if `pnpm-lock.yaml`
   hasn't changed, pnpm is a no-op).

6. **No Postgres docker compose** — appee uses Supabase (hosted), so
   the local stack is just Next.js. No `docker compose up` needed.

   If the slice ever needs a *local* Postgres (eg. heavy Drizzle
   migration test), add the docker setup here at that point — Slice 0
   doesn't need it.

7. **Slot-unique port for Next.js dev server** — Step 5's smoke uses
   `pnpm dev`, which defaults to `:3000`. Two concurrent workers would
   collide. Export a slot-unique port now so every later step picks it
   up:

   ```bash
   export LOCAL_PORT=$((3000 + SLOT_N - 1))   # slot 1 → 3000, slot 2 → 3001, ...
   export LOCAL_BASE_URL="http://127.0.0.1:${LOCAL_PORT}"
   ```

   Next.js: pass `--port "$LOCAL_PORT"` when launching.

## Git pattern

- Never `git checkout main` directly in the worktree. Always
  `git fetch origin && git checkout --detach origin/main`, then
  `git checkout -b <branch> origin/main`.
- The worktree shares the `.git` directory with the main repo, so
  refs (branches, tags) are consistent across slots — but checked-out
  files and the working-tree HEAD are independent per slot.
- A branch name can only be checked out in ONE worktree at a time. If
  Step 3 wants a branch that's already checked out elsewhere, pick a
  fresh name (e.g. suffix with `-$SLOT_N`) rather than fighting for it.

## Cleanup on exit

Only remove **your own** slot:

```bash
cd "$MAIN_REPO"
git worktree remove "$WORKTREE_DIR" --force
# node_modules lives inside the worktree dir, so it's gone with the
# directory. pnpm's global store is unaffected.
```

If b-start is killed mid-run, the directory and node_modules linger on
disk. The next `git worktree prune` (Step 1 of the next claim) won't
remove them because the worktree is still registered. Manual recovery:

```bash
git worktree list                       # find the stale slot path
STALE_SLOT="../appee-worker-N"          # replace N with the dead slot
git worktree remove --force "$STALE_SLOT"   # frees the slot ref + dir
```

A dead-but-registered slot ties up one of the 8 numbers until manually
cleared.

## Why not lockfiles / flock

`git worktree add` already exits non-zero if the target path is a live
worktree. That IS the lock, and it's race-free without any cooperation
between workers (every `git worktree add` call goes through git's
internal worktree registry). Adding a lockfile on top would be
ceremony around the same primitive.

→ Continue to Step 0b.
