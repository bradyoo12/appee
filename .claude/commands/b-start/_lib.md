# b-start shared lib — constants + GraphQL/CLI helpers

> Single source of truth for **@appee project board #29** metadata
> and the helper shell functions used by every `b-start/step*.md`.
> Mirror of [.claude/commands/create-ticket.md](../create-ticket.md)
> Step 7 metadata — if one side changes, update the other.

## Constants

```bash
APPEE_REPO="bradyoo12/appee"
APPEE_PROJECT_NUM=29
APPEE_PROJECT_ID="PVT_kwHNf9fOAV0K4A"
APPEE_STATUS_FIELD="PVTSSF_lAHNf9fOAV0K4M4Unryo"

STATUS_BACKLOG="f75ad846"
STATUS_READY="61e4505c"
STATUS_IN_PROGRESS="47fc9ee4"
STATUS_IN_REVIEW="df73e18b"
STATUS_DONE="98236657"
```

## Helper: parse `$ARGUMENTS` into an issue number

Accepted forms: `123`, `#123`, `https://github.com/bradyoo12/appee/issues/123`,
or empty (loop mode). `next` keyword → leave `ISSUE_NUM` empty and let
Step 2 pick the next Ready.

```bash
parse_issue_num() {
  local raw="$1"
  case "$raw" in
    "" )                    echo "" ;;
    next )                  echo "" ;;
    "#"* )                  echo "${raw#\#}" ;;
    *github.com*issues/* )  echo "$raw" | grep -oE '/issues/[0-9]+' | grep -oE '[0-9]+' ;;
    *[!0-9]* )              echo "ERROR: cannot parse issue number from '$raw'" >&2; return 1 ;;
    * )                     echo "$raw" ;;
  esac
}
```

## Helper: query the full board

Returns one TSV line per item: `item_id<TAB>issue_num<TAB>state<TAB>status_name<TAB>labels_csv<TAB>title`

```bash
fetch_board() {
  gh api graphql -f query='
  query($owner: String!, $proj: Int!) {
    user(login: $owner) {
      projectV2(number: $proj) {
        items(first: 100) {
          nodes {
            id
            content {
              ... on Issue {
                number
                title
                state
                url
                labels(first: 20) { nodes { name } }
              }
            }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  optionId
                  name
                  field { ... on ProjectV2SingleSelectField { name } }
                }
              }
            }
          }
        }
      }
    }
  }' -F owner=bradyoo12 -F proj=$APPEE_PROJECT_NUM
}

# Flatten the GraphQL response into one-line-per-item TSV
flatten_board() {
  local raw="$1"
  echo "$raw" | python3 -c '
import json, sys
data = json.load(sys.stdin)["data"]["user"]["projectV2"]["items"]["nodes"]
for n in data:
    c = n.get("content") or {}
    num = c.get("number", "")
    state = c.get("state", "")
    title = (c.get("title", "") or "").replace("\t", " ")
    labels = ",".join(l["name"] for l in c.get("labels", {}).get("nodes", []))
    status = ""
    for fv in n.get("fieldValues", {}).get("nodes", []):
        if fv and fv.get("field", {}).get("name") == "Status":
            status = fv.get("name", "")
            break
    print("\t".join([n["id"], str(num), state, status, labels, title]))
'
}
```

## Helper: issue number → project item ID

```bash
issue_to_item_id() {
  local issue_num="$1"
  fetch_board | flatten_board "$(cat)" | awk -F'\t' -v n="$issue_num" '$2 == n { print $1; exit }'
}

# Cache-friendly variant — pass an already-fetched flattened board
item_id_from_flat() {
  local flat="$1" issue_num="$2"
  echo "$flat" | awk -F'\t' -v n="$issue_num" '$2 == n { print $1; exit }'
}
```

## Helper: set status

```bash
set_item_status() {
  local item_id="$1" option_id="$2"
  gh project item-edit \
    --project-id "$APPEE_PROJECT_ID" \
    --id "$item_id" \
    --field-id "$APPEE_STATUS_FIELD" \
    --single-select-option-id "$option_id" \
    --format json --jq '.id'
}

# Idempotent — safe to call even if already in target status
move_issue_to_status() {
  local issue_num="$1" option_id="$2"
  local item_id
  item_id=$(issue_to_item_id "$issue_num")
  if [ -z "$item_id" ]; then
    echo "WARN: issue #$issue_num not on board; skipping status move" >&2
    return 0
  fi
  set_item_status "$item_id" "$option_id" > /dev/null
}
```

## Helper: read issue body + title

```bash
issue_body() {
  gh issue view "$1" --repo "$APPEE_REPO" --json body --jq '.body'
}

issue_title() {
  gh issue view "$1" --repo "$APPEE_REPO" --json title --jq '.title'
}

issue_labels() {
  gh issue view "$1" --repo "$APPEE_REPO" --json labels --jq '[.labels[].name] | join(",")'
}
```

## Helper: branch slug from issue title

Korean-only titles produce empty ASCII slugs; fall back to `issue-N`.

```bash
make_slug() {
  local issue_num="$1" title="$2"
  local slug
  slug=$(echo "$title" \
    | tr '[:upper:]' '[:lower:]' \
    | tr -cs 'a-z0-9' '-' \
    | sed -E 's/^-+|-+$//g' \
    | cut -c1-50 \
    | sed -E 's/-+$//')
  if [ -z "$slug" ]; then
    echo "issue-${issue_num}"
  else
    echo "$slug"
  fi
}

# Final branch name used by Step 3
branch_for_issue() {
  local issue_num="$1"
  local title slug
  title=$(issue_title "$issue_num")
  slug=$(make_slug "$issue_num" "$title")
  echo "${issue_num}-${slug}"
}
```

## Helper: append a comment to an issue

Used by step3 deploy-retry failure notes:

```bash
append_failure_comment() {
  local issue_num="$1" body="$2"
  gh issue comment "$issue_num" --repo "$APPEE_REPO" --body "$body"
}
```

## Helper: extract slice number from issue body

The board has no Slice field, so derive it from the issue body's `## Slice` section
(written by `/create-ticket` Step 4).

```bash
get_issue_slice() {
  local issue_num="$1"
  gh issue view "$issue_num" --repo "$APPEE_REPO" --json body --jq '.body' \
    | awk '/^- \*\*Slice\*\*/{print; exit} /^## Slice/{getline; getline; print; exit}' \
    | grep -oE 'Slice [0-9]+' | grep -oE '[0-9]+' | head -1
}

# Fallback: read from `slice:N` label
get_issue_slice_from_label() {
  local issue_num="$1"
  gh issue view "$issue_num" --repo "$APPEE_REPO" --json labels \
    --jq '.labels[] | select(.name|startswith("slice:")) | .name' \
    | head -1 | grep -oE '[0-9]+'
}
```

## On-hold convenience

```bash
mark_on_hold() {
  local issue_num="$1" reason="$2"
  # Create label if missing (idempotent)
  gh api "repos/${APPEE_REPO}/labels/on%20hold" --silent 2>/dev/null \
    || gh api --method POST "repos/${APPEE_REPO}/labels" \
         -f name="on hold" -f color="fbca04" \
         -f description="자동 조사 한도 도달 — 사람 개입 필요" --silent
  gh api --method POST "repos/${APPEE_REPO}/issues/${issue_num}/labels" \
    -f "labels[]=on hold" --silent
  gh issue comment "$issue_num" --repo "$APPEE_REPO" \
    --body "**On hold** — $reason"
}
```

## Helper: pnpm in slot-local worktree

`pnpm install` in a worktree creates its own `node_modules` (symlinks
to the global content-addressable store, so it's cheap). Each slot's
worktree is independent — different branches may have different lockfiles.

```bash
# Run from $WORKTREE_DIR
ensure_pnpm_install() {
  if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
    pnpm install --frozen-lockfile
  fi
}
```
