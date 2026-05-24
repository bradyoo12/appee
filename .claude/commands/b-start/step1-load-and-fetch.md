# Step 1: Load Reference Docs

Read these **in parallel** before doing anything else. They define the
slice plan + working agreements for appee.

## Required reads

- [.claude/plans/00-project-kickoff.md](../../plans/00-project-kickoff.md) —
  master plan: north star, slice roadmap (S0~S8), engineering decisions,
  milestones. Source of truth for slice order.
- [demo/index.html](../../../demo/index.html) — user workflow single
  source of truth (memory `feedback_demo_compliance.md`). Implementation
  must stay consistent with what demo shows.
- [docs/decisions/](../../../docs/decisions/) — ADRs (특히 0004 EAS
  배포 함정, 0005 단일 EAS project, 0006 Vercel + REST, no worker)
- [README.md](../../../README.md) — current capabilities + Quickstart

## Shared lib

Source [`_lib.md`](_lib.md) — constants (`APPEE_PROJECT_ID`, status
option IDs) + helper functions (`fetch_board`, `flatten_board`,
`issue_to_item_id`, `set_item_status`, `issue_body`, `branch_for_issue`,
`get_issue_slice`, `mark_on_hold`). Every later step reuses these.

## Active slice detection

The kickoff plan defines slice order S0 → S8, but doesn't expose a
single "active slice" field. Derive it:

```bash
# The lowest slice number with at least one ticket in Ready / In progress /
# In review on the board. Falls back to "0" if board is empty.
```

The board itself is the source of ticket state — there is no
`tickets/README.md` index to load (appee never adopted that pattern).

## Slice deferral signals

Per the kickoff plan, some slices are explicitly **deferred** until a
prior slice's exit criteria are met:

| Slice | Gate |
|-------|------|
| S0 (Walking skeleton) | always allowed |
| S1+ | requires S0 EAS Build validated (per memory `project_walking_skeleton_validated.md` — 2026-05-22 done) |
| S2.5 (Context sources) | requires S1+ AI generation working |
| S6+ | requires S3~S5 reverse-fill loop functioning |

Step 2's slice-order gate uses these.

## What this step is for

- **Step 2 (audit)** — needs slice order from kickoff plan + the helper
  functions loaded
- **Step 3 (implement)** — needs the issue body fetch helpers + demo
  compliance awareness
- **Step 5 (verify)** — needs the kickoff plan's "Done when" gates per
  slice (when those land)

→ Continue to Step 2.
