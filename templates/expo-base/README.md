# `@appee/template-expo-base`

The **base Expo template** that the appee builder clones and substitutes per user app.

This is _not_ a shipped product. It's the input to the substitution engine in
`packages/builder` (E3-3): every app that appee generates starts from this template.

## Slice 0 scope

- Expo SDK 52, RN 0.76, New Architecture on
- Expo Router v4 (filesystem routing)
- TypeScript 5+ strict (extends `tsconfig.base.json`)
- A single screen at `app/index.tsx` that renders one substitutable headline (`{{HEADLINE}}`)
- No styling lib (NativeWind), no state lib, no networking lib — those come per slice

## Run locally (during template development)

```bash
pnpm install                      # at workspace root
pnpm --filter @appee/template-expo-base start
```

Then scan the QR with Expo Go (Android) or use a simulator. `expo start --web`
also works for a quick smoke test.

## Substitution placeholders (consumed by `packages/builder`, E3-3)

| Placeholder    | Where                  | Replaced with               |
| -------------- | ---------------------- | --------------------------- |
| `{{HEADLINE}}` | `app/index.tsx`        | The user's one-line input   |

Expand this table as new placeholders are introduced — keep it the source of
truth for the builder.

## Notes

- `metro.config.js` is set up for the pnpm + Turborepo monorepo (workspace
  watchFolders + disabled hierarchical lookup).
- `app.json` carries placeholder bundle IDs (`app.appee.hellobase`); these are
  rewritten per generated app (Slice 0 will use a per-user shortid scheme — see
  kickoff plan §13 step 8).
- `babel-preset-expo` includes `react-native-reanimated/plugin` last, as
  required by Reanimated.
