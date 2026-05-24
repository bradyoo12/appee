# Step 2: Audit Tickets

Query the **@appee project board #29** for current ticket state and
produce a `READY` priority queue respecting kickoff-plan slice order.

`_lib.md`'s `fetch_board` + `flatten_board` are the only data source —
there is no file-based reconciliation step. The board is the source of
truth.

## Steps

1. **Fetch + flatten the board**:

   ```bash
   BOARD_RAW=$(fetch_board)
   BOARD_FLAT=$(flatten_board "$BOARD_RAW")
   # BOARD_FLAT is TSV: item_id  issue_num  state  status_name  labels  title
   ```

2. **Classify** each item into one of:

   | Category      | Condition |
   |---------------|-----------|
   | `READY`       | `status_name == "Ready"` AND `state == "OPEN"` AND labels do NOT include `on hold` |
   | `IN_PROGRESS` | `status_name == "In progress"` AND `state == "OPEN"` |
   | `IN_REVIEW`   | `status_name == "In review"` AND `state == "OPEN"` |
   | `ON_HOLD`     | labels include `on hold` (regardless of status) |
   | `DONE`        | `status_name == "Done"` OR `state == "CLOSED"` |
   | `BACKLOG`     | `status_name == "Backlog"` — visible but NOT auto-pickup |
   | `NO_STATUS`   | item exists on board but Status field unset — surface as warning |

   ```bash
   ready=$(echo "$BOARD_FLAT" | awk -F'\t' '
     $3 == "OPEN" && $4 == "Ready" && index($5, "on hold") == 0 { print $2 }')
   in_progress=$(echo "$BOARD_FLAT" | awk -F'\t' '$3 == "OPEN" && $4 == "In progress" { print $2 }')
   in_review=$(echo "$BOARD_FLAT" | awk -F'\t' '$3 == "OPEN" && $4 == "In review" { print $2 }')
   on_hold=$(echo "$BOARD_FLAT" | awk -F'\t' 'index($5, "on hold") > 0 { print $2 }')
   ```

3. **Slice-order gate** — kickoff plan's slice order is enforced.

   Read each ready issue's slice from body `## Slice` or `slice:N` label
   (helper `get_issue_slice` in [`_lib.md`](_lib.md)):

   ```bash
   for NUM in $ready; do
     SLICE=$(get_issue_slice "$NUM")
     [ -z "$SLICE" ] && SLICE=$(get_issue_slice_from_label "$NUM")
     echo "$NUM	$SLICE"
   done
   ```

   Determine the current active slice from the board (lowest slice with
   READY/IN_PROGRESS/IN_REVIEW items). Reject a ticket from `READY` if
   its slice would jump ahead more than 1 slice from active.

   Single-ticket mode (`$ISSUE_NUM` provided as argument) overrides —
   surface the violation in Korean chat but proceed (user explicitly
   asked).

4. **Produce the READY priority queue**:

   For each issue number in `ready`, sort by:

   1. Board position (top of column first — preserves the manual
      prioritization done in `/create-ticket` Step 7 +
      `updateProjectV2ItemPosition`)
   2. Slice number ascending (lower slice wins on ties)
   3. `priority:p0` label presence (p0 wins)
   4. Issue number ascending (oldest wins on ties)

   The top entry is the **next-up**.

5. **Report**:

   ```
   === Ticket Audit ===
   Board: https://github.com/users/bradyoo12/projects/29/views/1
   Active slice: <slice-N>
   READY: <count>       → next: #<NUM> "<title>" (slice:<N>)
   IN_PROGRESS: <count>
   IN_REVIEW: <count>
   ON_HOLD: <count>
   BACKLOG: <count>
   DONE: <count>
   ```

   When `IN_PROGRESS > 0` and we're entering loop mode, flag it — likely
   a previous run crashed mid-cycle. The user should `/b-start <NUM>`
   to resume the abandoned item, or manually flip its status.

## What this step does NOT do

- Modify any board item or issue (Step 3's job)
- Promote `on hold` back to Ready (requires Step 5b enrichment or
  explicit human label removal)
- Skip the slice-order check — kickoff plan's slice order is the gate
- Read demo/index.html for ticket content (that's Step 3's job during
  implementation)

→ Continue to Step 3.
