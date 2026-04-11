# PRD: Wave 2A Container Parity

## Goal

Deliver contract-first organization/project home container parity for the repo-root Rust + React workspace, matching legacy Yona home/header/menu/settings/summary behavior without widening into downstream issue/board/code/pull-request pages.

## In Scope

- additive proto RPCs for:
  - `ReadOrganizationContainer`
  - `ReadProjectContainer`
  - `UpdateProjectOverview`
  - `ToggleProjectWatch`
- generated frontend client refresh from the updated proto contract
- organization container payload for:
  - description hero
  - project search/filter shell
  - create-project CTA gate
  - visible project cards
  - admin/member roster side bubbles
  - settings gate
- project container payload for:
  - header and breadcrumb/meta state
  - watch/favorite/enroll/update gates
  - clone URL shell
  - overview editable shell
  - menu flags and ACL-filtered counts
  - default-tab chrome for README/history/dashboard placeholders
  - member and current-milestone summary blocks
  - settings shell parity
- route/UI parity tests for the new home surfaces

## Non-goals

- no replacement or widening of existing `ReadOrganizationDetail`, `ReadProjectDetail`, `ReadOrganizationMembers`, or `ReadProjectMembers`
- no real README/history/dashboard content fetch
- no downstream organization/project issue, board, pull request, review, post, or code-page parity work
- no provenance wording re-audit for prior Wave 1 rows in this packet
- no new architecture beyond the fixed `frontend/`, `proto/`, and `crates/*` ownership boundaries

## Fixed Decisions

- Existing thin detail/settings/member RPCs remain for current consumers and compatibility.
- Wave 2A frontend home routes consume only the new container RPCs.
- Container count fields follow legacy ACL visibility:
  - hidden menus may omit counting work or return `0`
  - visible menus return counts aligned with legacy menu behavior
- Unauthorized organization viewers receive empty admin/member rosters plus closed create/settings gates.
- README/history/dashboard tabs return placeholder panels only, but preserve tab title, active-tab state, and default-tab wiring.
- Main integration flow uses fresh worktrees branched from `main@1293be06ba7b91d109f000edafd12ad1423ecd8b`.

## User Stories

### US-001 Organization Home Container
As a viewer of an organization home page, I need the page header, menu, CTA gates, roster bubbles, and visible project cards to match the legacy organization home flow.

Acceptance criteria:
- organization home shows description hero, project filter shell, visible project cards, and settings/create gates from one container response
- admin/member roster blocks are gated to admin/member/site-admin viewers
- non-authorized viewers do not receive roster data or org admin controls

### US-002 Project Home Container
As a viewer of a project home page, I need the legacy header/menu/right-pane shells and overview editing/watch state to appear from a single project container response.

Acceptance criteria:
- project header shows breadcrumb/logo/background/scope/fork origin/watch/favorite/enroll state from one container response
- project menu flags and counts respect menu settings plus ACL
- right pane renders member summary, milestone summary, and action blocks
- README/history/dashboard tabs use default-tab placeholder shells only

### US-003 Project Overview and Watch Mutation
As a project manager or watcher-capable viewer, I need overview editing and watch toggling to update the project home container without reopening the old thin detail flow.

Acceptance criteria:
- `UpdateProjectOverview` only mutates the overview block and returns a refreshed project container
- `ToggleProjectWatch` flips watch state and count consistently and returns a refreshed project container
- frontend project home mutations refresh from the new container RPC path

## Success Signal

Wave 2A routes render legacy-shaped org/project home shells from the additive container contract, backend/frontend verification is green, and final integration passes the shared full-suite checks.
