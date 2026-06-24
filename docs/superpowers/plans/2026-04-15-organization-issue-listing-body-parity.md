# Organization Issue Listing Body Parity Implementation Plan

> Status: superseded by Phase -1 REST pivot
> This plan describes the pre-REST implementation packet. Treat its transport references as historical; current application work uses `/api/v1` REST and TanStack Query.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the canonical organization issue listing placeholder with a legacy-parity organization-shell page that lists issues across the viewer’s visible projects in that organization.

**Architecture:** Reuse the merged project issue list foundation, but keep the legacy organization design intact: this is not an organization-owned issue domain, it is an organization-scoped cross-project inbox. The packet should add only the minimum read contract, backend aggregation, view models, and frontend body needed to match legacy GET-query-driven listing behavior inside the existing organization shell.

**Tech Stack:** Rust workspace (`axum`, `connectrpc`, `sea-orm`), React SPA (`@tanstack/react-router`, generated Connect client), protobuf contracts, legacy Yona (`yona-original/`) as parity source.

---

## 1. Why this is the next packet

Current canonical evidence shows:

- `frontend/src/routes/organizations/$organizationName/issues/route.tsx` still renders `PlaceholderPage`.
- `docs/plans/2026-04-11-wave-2b-organization-follow-up.md` marks **organization issue listing body parity** as the first active follow-up gap.
- `docs/superpowers/plans/2026-04-15-yoram-phase-2a-project-issue-surface-parity.md` names this as the immediate next packet after project issue list/detail parity.
- Legacy Yona treats `/organizations/:organizationName/issues` as an organization-shell page over issues from the viewer’s visible projects, not as a new organization-owned issue model.

Therefore the next packet is **organization issue listing body parity only**.

---

## 2. Legacy contract that must drive the work

### Route and controller

- `yona-original/conf/routes`
  - `GET /organizations/:organizationName/issues -> controllers.IssueApp.organizationIssues(...)`
- `yona-original/app/controllers/IssueApp.java`
  - `organizationIssues(String organizationName, String state, String format, int pageNum)`

### Query/filter semantics

- `yona-original/app/models/support/SearchCondition.java`
  - `asExpressionList(Organization organization)`

### UI composition

- `yona-original/app/views/organization/group_issue_list.scala.html`
- `yona-original/app/views/organization/group_issue_search_partial.scala.html`
- `yona-original/app/views/organization/group_issue_list_partial.scala.html`
- `yona-original/app/views/organization/group_issue_list_quicksearch.scala.html`
- `yona-original/app/views/organization/header.scala.html`
- `yona-original/app/views/organization/menu.scala.html`

### Message/copy anchors

- `yona-original/conf/messages`
  - `menu.issue`
  - `title.issueList`
  - `organization.choose.projects`
  - `issue.list.all`
  - `issue.list.assignedToMe`
  - `issue.list.authoredByMe`
  - `issue.list.mentionedOfMe`
  - `issue.state.open`
  - `issue.state.closed`
  - `issue.is.empty`
  - `common.order.*`

---

## 3. Slice boundary

### In scope

- Organization issue route body parity for `/organizations/$organizationName/issues`
- Legacy organization shell composition: header + menu + active `Issue` tab
- GET-query-driven list state:
  - `state`
  - `pageNum`
  - `projectNames[]`
  - `filter`
  - `orderBy`
  - `orderDir`
  - `authorId`
  - `assigneeId`
  - `mentionId`
- Cross-project issue aggregation over the viewer’s visible projects in the organization
- Open/closed tabs with counts scoped to the current query context
- Project selector, text search, sort links, quick filters, pagination shell, empty state, and issue rows
- Row links that continue to point into project issue detail and project pages

### Out of scope

- Organization board listing body parity
- Organization pull-request listing body parity
- Project issue create/edit/delete
- Issue comments/timeline/detail expansion beyond existing project route links
- Label/milestone admin surfaces
- Search/PR/review/VCS/admin/project-management expansion

### Important legacy constraints

- Do **not** redesign this as an organization-owned issue model.
- Do **not** drop GET-driven state in favor of client-only list state.
- Do **not** broaden organization visibility beyond `organization.getVisibleProjects(currentUser)` semantics.

---

## 4. Canonical files expected to change

### Frontend route/shell

- Modify: `frontend/src/routes/organizations/$organizationName/issues/route.tsx`
- Reuse/modify as needed:
  - `frontend/src/routes/organizations/$organizationName/route.tsx`
  - `frontend/src/routes/-organization-views.tsx`
  - `frontend/src/routes/-shared.tsx`
  - `frontend/src/routes/-issue-views.tsx`
  - `frontend/src/routes/-view-models.ts`
  - `frontend/src/app-view-models.ts`

### Frontend client/contract usage

- Modify: `frontend/src/auth-workspace-client.ts`
- Generated after proto change:
  - `frontend/src/gen/yona/pilot/v1/pilot_pb.ts`
  - `frontend/src/gen/yona/pilot/v1/pilot-PilotService_connectquery.ts`

### Contract/backend

- Modify: `proto/yona/pilot/v1/pilot.proto`
- Modify: `crates/server/src/lib.rs`
- Modify: `crates/persistence/src/repo.rs`
- Modify: `crates/persistence/src/repo_types.rs`

### Tests

- Modify/add:
  - `crates/server/tests/db_router_contract.rs`
  - `frontend/src/route-parity.spec.tsx`
  - `frontend/tests/shell-routing-smoke.e2e.ts`

---

## 5. Execution sequence

### Task 1: Freeze the parity contract

**Purpose:** Make sure implementation follows legacy structure instead of “reasonable modernization.”

- [ ] Read these legacy files together before changing code:
  - `yona-original/conf/routes`
  - `yona-original/app/controllers/IssueApp.java`
  - `yona-original/app/models/support/SearchCondition.java`
  - `yona-original/app/views/organization/group_issue_list.scala.html`
  - `yona-original/app/views/organization/group_issue_search_partial.scala.html`
  - `yona-original/app/views/organization/group_issue_list_partial.scala.html`
  - `yona-original/app/views/organization/group_issue_list_quicksearch.scala.html`
  - `yona-original/app/views/organization/header.scala.html`
  - `yona-original/app/views/organization/menu.scala.html`
- [ ] Record these parity invariants before coding:
  - organization shell page, not standalone search page
  - visible-project-scoped aggregation only
  - GET-driven state surface
  - open default state
  - quick filters are current-user-centric
  - row links go to project issue detail
  - project name remains visible in each row
  - empty-state and sorting UI stay in the legacy locations

**Success criteria:** The engineer can explain legacy behavior without referencing any Rust-side assumptions.

### Task 2: Write failing tests for the missing parity body

**Purpose:** Capture the gap before adding code.

- [ ] Add a failing frontend parity test proving `frontend/src/routes/organizations/$organizationName/issues/route.tsx` no longer may render `PlaceholderPage`.
- [ ] Add a failing browser smoke test that expects the organization issue route to render:
  - org shell with active issue tab
  - open/closed tabs
  - project selector
  - search box
  - at least one issue row with project link and issue detail link
- [ ] Add failing backend contract coverage for an organization issue list read path that returns:
  - organization name
  - query-scoped tab counts or enough data to render them
  - issue rows with project context
  - pagination metadata needed by the frontend shell
- [ ] Add failing forbidden/not-found coverage for the organization issue route, matching existing canonical shell behavior.

**Success criteria:** Tests fail because the route/body and backend aggregation are missing, not because of unrelated setup errors.

### Task 3: Add the minimal read contract and backend aggregation

**Purpose:** Support organization issue list rendering without widening into unrelated issue lifecycle work.

- [ ] Extend `proto/yona/pilot/v1/pilot.proto` with a minimal organization issue list read RPC.
- [ ] Regenerate frontend client artifacts.
- [ ] Add repository types and repository queries for organization issue aggregation over visible projects.
- [ ] Preserve these semantics explicitly:
  - default `open` state
  - `isDraft = false`
  - project scoping via visible projects for the viewer
  - GET query fields listed in Section 3
- [ ] Implement server wiring in `crates/server/src/lib.rs`.
- [ ] If full legacy search semantics are too wide for this packet, land only the subset needed for body parity first, but keep the contract shaped around legacy fields rather than inventing a different query model.

**Success criteria:** The backend can answer an org issue listing read request with enough data to render the legacy-aligned shell/body truthfully.

### Task 4: Implement frontend body parity inside the existing organization shell

**Purpose:** Replace the placeholder with a real organization issue inbox page.

- [ ] Replace `frontend/src/routes/organizations/$organizationName/issues/route.tsx` with a data-backed route using the existing runtime/error-shell pattern.
- [ ] Reuse organization container context from existing organization routes.
- [ ] Reuse project issue list rendering only where it does not distort the organization-shell IA.
- [ ] Preserve these visible structures from legacy:
  - organization header
  - organization menu with active Issue tab
  - left filter/search area
  - open/closed tabs with counts
  - sort links in the list header area
  - cross-project issue rows including project name
  - empty-state block
  - pagination block
- [ ] Keep row navigation behavior legacy-aligned:
  - issue title → project issue detail
  - project name → project page
  - if label links are included in this packet, preserve the legacy behavior of routing to the project issue list and document any deliberate deviation

**Success criteria:** `/organizations/$organizationName/issues` is a real screen and visibly reads like the legacy org issue inbox, not like a renamed project list.

### Task 5: Verify without scope creep

**Purpose:** Finish the packet cleanly and stop before adjacent features leak in.

- [ ] Run frontend typecheck and build.
- [ ] Run targeted backend contract tests.
- [ ] Run targeted frontend parity tests.
- [ ] Run browser smoke for:
  - successful org issue list render
  - forbidden route shell
  - not-found route shell
  - GET-query-driven state on tabs/search/sort/project selection
- [ ] Confirm that organization board/PR listing bodies remain placeholder-only follow-ups.

**Success criteria:** The org issue listing body is real, verified, and still scoped only to this packet.

---

## 6. Recommended atomic commit sequence

1. `Pin organization issue listing parity gap`
2. `Add organization issue listing read path`
3. `Restore organization issue listing body parity`
4. `Lock organization issue parity verification`

If generated frontend artifacts change with the proto update, keep them in the same commit as the source proto.

---

## 7. Highest-risk parity traps

- Treating org issue listing as organization-owned data instead of cross-project aggregation
- Accidentally including hidden/private projects that legacy would exclude
- Replacing GET-query state with local React-only state
- Reusing project issue UI too aggressively and losing the org-shell layout
- Expanding into create/edit/delete/comments/timeline/board/PR work in the same packet
- “Fixing” legacy quirks like quick-filter current-user semantics or row-link behavior without documenting a deviation

---

## 8. Immediate follow-up after this packet

1. organization board listing body parity
2. organization pull-request listing body parity
3. project issue create/edit/delete packet
4. project issue comments/timeline interaction parity

These should remain separate packets unless implementation uncovers a hard dependency that cannot be isolated.
