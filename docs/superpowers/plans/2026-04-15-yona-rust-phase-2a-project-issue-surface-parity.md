# Yona Rust Phase 2A Project Issue Surface Parity Implementation Plan

> Status: superseded by Phase -1 REST pivot
> This plan describes the pre-REST implementation packet. Treat its transport references as historical; current application work uses `/api/v1` REST and TanStack Query.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the canonical repo-root placeholder issue screens with legacy-parity project issue list and issue detail flows, using the existing Rust workspace foundations and preserving legacy Yona UI/UX exactly.

**Architecture:** Reuse the current repo-root ownership only: `frontend` for route/UI parity, `proto` for any missing issue list/detail contract surface, `crates/server` for route/RPC handling, `crates/domain` for issue authorization and read behavior, and `crates/persistence` for issue read models. Do not introduce new architecture, abstractions, or UX improvements; port legacy behavior and layout into the existing project shell.

**Tech Stack:** Rust workspace (`axum`, `connectrpc`, `sea-orm`), React SPA (`@tanstack/react-router`, generated Connect client), protobuf contracts, legacy Yona (`yona-original/`) as parity source.

---

## 1. Why this is the next slice

Current repo-root evidence shows:

- Phase 1 foundations are present: auth/workspace/org/project are partially implemented and wired in the canonical workspace.
- `frontend/src/routes/projects/route.tsx` is already a real screen backed by runtime client data.
- `frontend/src/routes/$owner/$projectName/issues/route.tsx` is still a `PlaceholderPage`.
- `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx` is still a `PlaceholderPage`.
- `docs/plans/2026-04-11-wave-2b-organization-follow-up.md` explicitly marks organization issue listing body parity as an active follow-up and Phase 2 issue lifecycle entry as deferred to the next packet.
- `docs/provenance/phase-0b/issue.md` confirms current issue work is only a bounded authorization exemplar, not full issue parity.

Therefore the best next parity packet is **Phase 2A: project-scoped issue surface parity**.

---

## 2. Recommended scope boundary

### In scope

- Project issue list parity
- Project issue detail parity
- Legacy-aligned direct-entry routing semantics for issue pages
- Read-path server/domain/persistence support required by those two screens
- Issue authorization matrix required for list/detail visibility and edit affordances
- Timeline and comment rendering needed for truthful issue detail parity
- Reuse of existing `/files` asset flow where issue detail references uploaded assets

### Out of scope for this packet

- Organization issue listing body parity
- Board listing/detail parity
- Pull request/review parity
- Search parity expansion
- VCS/code browser work
- Full issue create/edit/delete mutation packet if it materially delays list/detail landing
- Label/milestone admin CRUD, mass update, sharers, watchers, voters, share flow

### Allowed extension if needed for honest parity

If issue list/detail cannot be rendered truthfully without lightweight label or milestone read support, add **read-only selector/display support** in the same packet. Do not expand into label/milestone administration routes yet.

---

## 3. Legacy parity anchors that must drive the work

### Legacy routes

- `yona-original/conf/routes`
  - `/:user/:project/issues`
  - `/:user/:project/issue/:number`
  - related issue form/edit deep links that influence menu and CTA parity

### Legacy controllers

- `yona-original/app/controllers/IssueApp.java`

### Legacy tests

- `yona-original/test/controllers/IssueAppTest.java`
- `yona-original/test/models/IssueTest.java`
- any issue read/detail API tests referenced by the controller suite

### Legacy views

- `yona-original/app/views/issue/list.scala.html`
- `yona-original/app/views/issue/view.scala.html`
- `yona-original/app/views/issue/create.scala.html`
- `yona-original/app/views/issue/edit.scala.html`
- `yona-original/app/views/issue/partial_comments.scala.html`
- `yona-original/app/views/issue/partial_event_timeline.scala.html`
- related issue partials under `yona-original/app/views/issue/*.scala.html`

These files define the required list structure, filters, tab semantics, issue metadata layout, comment ordering, event timeline composition, copy, CTA placement, and auth-failure behavior.

---

## 4. Canonical repo-root files and layers expected to change

### Frontend

- `frontend/src/routes/$owner/$projectName/issues/route.tsx`
- `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`
- any new issue-specific shared view modules under `frontend/src/routes/` or adjacent canonical frontend files, following existing route composition patterns
- `frontend/src/auth-workspace-client.ts` if new typed client helpers are required
- generated client usage sites already backed by `frontend/src/app-runtime-context.tsx` patterns

### Contract

- `proto/` issue-related service definitions were considered in this historical plan only because the runtime contract had not yet been moved to REST

### Server

- `crates/server/src/lib.rs`
- related request/response mapping helpers used by the canonical RPC and route surface

### Domain

- `crates/domain/src/lib.rs`
- new or expanded issue-specific domain logic modules under `crates/domain/src/`
- `crates/domain/tests/` for issue authorization/read behavior

### Persistence

- `crates/persistence/src/repo.rs`
- existing issue/comment/event-related entity modules as needed for read assembly
- `crates/persistence/tests/` for issue read repository coverage

---

## 5. Execution sequence

### Task 1: Freeze the parity contract before editing code

**Purpose:** Prevent a generic “issue page” implementation that drifts from legacy structure.

- [ ] Read `SPEC.md`, `AGENTS.md`, and `docs/provenance/core-parity-audit.md` issue rows before touching any issue code.
- [ ] Read the legacy route/controller/view/test anchors listed in Section 3.
- [ ] Record the required issue list and issue detail parity checklist directly from legacy: menu position, tab labels, filters, badge/count semantics, metadata blocks, comment/timeline ordering, empty states, auth failure behavior, not-found behavior, and deep links.
- [ ] Confirm the current canonical frontend placeholders in:
  - `frontend/src/routes/$owner/$projectName/issues/route.tsx`
  - `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`

**Success criteria:** The worker can name exactly what the legacy issue list/detail pages must contain before any code change begins.

### Task 2: Land failing tests for the visible parity gap

**Purpose:** Make the missing parity explicit and measurable.

- [ ] Add failing frontend route parity coverage proving the issue list route no longer may render `PlaceholderPage`.
- [ ] Add failing frontend route parity coverage proving the issue detail route no longer may render `PlaceholderPage`.
- [ ] Add failing direct-entry auth tests for anonymous, forbidden, and not-found issue routes, matching the existing shell semantics already used in other canonical routes.
- [ ] Add failing domain/server tests for the legacy issue authorization matrix anchored by `IssueAppTest`:
  - author editable
  - assignee editable
  - manager editable
  - member editable
  - site admin editable
  - outsider/nonmember denied

**Success criteria:** Tests fail for the exact missing parity conditions rather than for generic compile errors.

### Task 3: Implement the minimal backend read packet for list/detail parity

**Purpose:** Supply truthful data to the real screens without widening scope into later issue workflows.

- [ ] Add or complete canonical contract methods for project issue list and issue detail only if they do not already exist.
- [ ] Implement server mapping for those read paths in `crates/server/src/lib.rs`.
- [ ] Implement domain helpers for issue visibility and edit-affordance decisions using the legacy authorization matrix.
- [ ] Expand persistence read assembly in `crates/persistence/src/repo.rs` so the frontend can render:
  - list rows
  - open/closed state
  - author/assignee metadata
  - labels/milestone display if needed for truthful parity
  - comment stream and event timeline blocks needed by detail parity
- [ ] Reuse existing `/files` and uploaded-asset patterns if issue detail references stored attachments or avatars.

**Success criteria:** The backend can answer project issue list/detail requests with data sufficient to render the legacy-aligned pages without placeholders or fake content.

### Task 4: Replace the project issue list placeholder with a real parity screen

**Purpose:** Close the most visible Phase 2 UI gap in the canonical frontend.

- [ ] Replace `frontend/src/routes/$owner/$projectName/issues/route.tsx` with a real screen using the same route path.
- [ ] Match the legacy issue list IA and wording, including project shell placement, filters, tab/count semantics, search/filter form placement, list row ordering, and empty states.
- [ ] Preserve legacy deep-link semantics so direct navigation to the issue list behaves identically under auth/not-found/forbidden conditions.
- [ ] Reuse existing canonical frontend composition patterns from implemented directory/project/workspace routes rather than inventing new screen architecture.

**Success criteria:** The project issue list route is no longer a placeholder and presents the legacy-aligned layout/copy/behavior inside the canonical project shell.

### Task 5: Replace the issue detail placeholder with a real parity screen

**Purpose:** Restore the second half of the minimum truthful issue surface.

- [ ] Replace `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx` with a real detail screen using the same route path.
- [ ] Match legacy issue detail composition: title/state/header metadata, author/assignee info, labels/milestone display as required, comment section, event timeline ordering, and edit affordances derived from authorization.
- [ ] Keep the direct-entry route semantics aligned with the existing canonical shells for login redirect / forbidden / not-found behavior.
- [ ] Preserve legacy copy and CTA placement; do not modernize or simplify the screen.

**Success criteria:** Issue detail is rendered as a real page with legacy-aligned sections and route semantics, not a placeholder.

### Task 6: Verify the packet without widening scope

**Purpose:** Finish the slice cleanly and stop before adjacent features spill in.

- [ ] Run frontend typecheck and route parity tests.
- [ ] Run relevant frontend Vitest suites and any direct-entry/auth shell tests affected by the new routes.
- [ ] Run backend/domain/persistence tests for the new issue read/auth behavior.
- [ ] Run a manual smoke check for:
  - anonymous direct entry
  - authenticated forbidden entry
  - not-found entry
  - project issue list render
  - issue detail render
- [ ] Confirm organization issue listing remains placeholder and is still tracked as follow-up, rather than being partially mixed into this packet.

**Success criteria:** The project issue list/detail parity packet is complete, verified, and still scoped to the intended Phase 2A boundary.

---

## 6. Sequencing rationale

This ordering is intentional:

1. **It follows the documented product sequence.** `SPEC.md` and `docs/agents/06-phase-plan.md` place issues at Phase 2 after auth/workspace/org/project.
2. **It closes the biggest current visible gap in repo-root frontend parity.** The canonical issue routes are still placeholders while neighboring project foundations already exist.
3. **It avoids duplicate work.** Organization issue listing body parity should be built on top of real project issue query/render semantics, not before them.
4. **It preserves migration discipline.** PR/review, search, board, and VCS all have their own later packets and should not absorb this work.
5. **It gives the shortest path to a truthful Phase 2 entry.** Project issue list/detail are the minimum surface that makes the Rust port look like actual Yona rather than a shell with dead links.

---

## 7. Immediate follow-up plan after Phase 2A

### Next packet

1. organization issue listing body parity
2. project issue create/edit/delete mutation packet
3. comments/timeline interaction packet if still incomplete after read parity
4. label/milestone management packet
5. board parity packet

### Explicitly not next

- organization board listing body
- organization pull-request listing body
- pull request/review full parity
- search widening
- VCS/history/compare
- deferred project admin/watchers/webhooks/transfer/change-VCS/statistics/delete

These remain later packets unless newly discovered legacy dependencies prove otherwise.

---

## 8. Risks and failure modes to avoid

- Do not ship generic issue screens that ignore legacy layout, copy, or section order.
- Do not start from organization aggregation first; it depends on truthful issue semantics at the project level.
- Do not treat the bounded `docs/provenance/phase-0b/issue.md` exemplar as if issue parity were already implemented.
- Do not widen into mass update, voter/watch/share, or full label/milestone admin unless they block honest list/detail rendering.
- Do not add new architectural layers when the current canonical workspace already provides the required boundaries.

---

## 9. Definition of done for this packet

- The two canonical project issue routes are no longer placeholders.
- Their UI/UX matches legacy Yona closely enough to count as parity for list/detail read flows.
- Direct-entry auth/not-found/forbidden behavior matches the legacy-aligned canonical shell semantics.
- Backend/domain/persistence support is real and verified, not mocked or hard-coded.
- Organization issue listing remains clearly tracked as the immediate follow-up, not silently abandoned.
- No out-of-scope expansion into PR/search/VCS/board or deferred project-admin work occurred.
