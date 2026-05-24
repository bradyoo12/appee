# Initialize appee Dev Environment

Switch to the bradyoo12 GitHub account, install dependencies, and load
project context. appee's local stack is much lighter than memoria's —
no docker compose, no venv, no background server required up-front.

## Steps

1. Switch GitHub account (check first, switch only if needed):
```bash
CURRENT_ACCOUNT=$(gh auth status 2>&1 | grep -oP 'account \K\S+' | head -1)
if [ "$CURRENT_ACCOUNT" != "bradyoo12" ]; then
  if ! gh auth switch --user bradyoo12 2>/dev/null; then
    echo "ERROR: bradyoo12 account is not authenticated. Run: gh auth login"
    exit 1
  fi
fi
```

2. Verify GitHub account:
```bash
gh auth status
```

3. Show project overview:
- **Console**: Next.js 15 App Router + RSC + Server Actions at
  `apps/console/` (deployed to Vercel)
- **DB**: Supabase Postgres via Drizzle ORM
  (`apps/console/src/db/schema/*.ts`, migrations in `drizzle/`)
- **Auth**: Supabase Auth (magic-link + Google OAuth + Apple OAuth
  planned)
- **Payment**: Stripe Checkout + Subscriptions (Slice 0+)
- **AI**: `@anthropic-ai/sdk` — Claude Sonnet 4.6 default, Opus 4.7
  for complex generation (Slice 1+)
- **Mobile output**: Expo SDK 52 + Expo Router at
  `templates/expo-base/` (excluded from pnpm workspace — memory
  `project_workspace_split.md`)
- **Build pipeline**: EAS Build via REST/CLI (Slice 0 walking skeleton
  validated 2026-05-22 — memory `project_walking_skeleton_validated.md`)
- **Current slice**: see `.claude/plans/00-project-kickoff.md` Section 3

4. Install / refresh dependencies (idempotent):
```bash
pnpm install --frozen-lockfile
```

5. Quick sanity check:
```bash
pnpm typecheck
pnpm lint
```

If either is red, surface and ask the user — don't auto-fix unless
asked.

6. Check repository status:
```bash
git status -s
```

7. Load project context from (parallel):
- `.claude/plans/00-project-kickoff.md` (master plan, slice roadmap)
- `demo/index.html` (사용자 워크플로우 SSOT)
- `docs/decisions/` (ADRs)
- `README.md` (Quickstart, capabilities)
- `MEMORY.md` (auto-memory index — already in conversation context)

## What this command does NOT do

- Launch `pnpm dev` automatically — that's per-task. Start when needed.
- Connect to Supabase prod — local dev uses Supabase project's anon key
  via env vars, not a local Postgres.
- Touch `.env` files — secrets are project-owner managed.
- Spawn EAS builds — that's a Slice 0 walking-skeleton trigger, not init.
