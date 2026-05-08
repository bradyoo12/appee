# appee

> Personalized mobile app generator. Sign up, get a real app on your phone in 5 minutes, and watch it adapt to you over time.

## Status

🚧 Pre-alpha. Slice 0 (walking skeleton) in progress.

See [the master plan](.claude/plans/00-project-kickoff.md) and the [project board](https://github.com/bradyoo12/appee/issues).

## Stack

- **Console** — Next.js 15 (App Router, RSC) + Tailwind v4 + shadcn/ui
- **DB / Auth / Storage** — Supabase + Drizzle ORM
- **Payment** — Stripe
- **AI** — Claude API (`@anthropic-ai/sdk`)
- **Mobile output** — Expo SDK 52 + Expo Router + NativeWind
- **Build** — EAS Build + EAS Update
- **Monorepo** — pnpm 9 + Turborepo 2 + Biome
- **Language** — TypeScript everywhere (strict)

## Layout

```
apps/        # Console (Next.js) and other apps
packages/    # Shared libs (db, shared, ai, builder, context-engine)
templates/   # Mobile app templates that appee generates from
infra/       # Supabase migrations, Stripe product definitions
```

## Develop

```bash
pnpm install
pnpm dev          # turbo runs all apps in parallel
pnpm lint         # biome check
pnpm typecheck    # turbo typecheck across packages
pnpm test
```

## License

Proprietary. All rights reserved.
