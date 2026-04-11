# Wave 2A Context Snapshot

## Task Statement

Implement the approved Wave 2A container packet in the repo-root canonical workspace.

## Desired Outcome

- Add contract-first organization/project container RPCs for home, header, menu, settings, and summary blocks.
- Keep existing thin detail/settings/member RPCs intact while making the new Wave 2A routes depend only on additive container RPCs.
- Split work across fresh worktrees based on `main@1293be06ba7b91d109f000edafd12ad1423ecd8b`.
- Finish with backend/frontend parity evidence and full integration verification.

## Known Facts / Evidence

- Canonical ownership is fixed at `frontend/`, `proto/`, and `crates/*`.
- Current main already includes file-based routing, `VerifyUser`, outbound mail delivery, and avatar upload/crop contract support.
- Current org/project UI is still thin:
  - `frontend/src/routes/organizations/$organizationName/route.tsx` reads `ReadOrganizationDetail` plus `ReadOrganizationMembers`.
  - `frontend/src/routes/$owner/$projectName/route.tsx` reads `ReadProjectDetail` and drives enroll/favorite mutations from the thin detail shape.
- Existing contract surface in `proto/yona/pilot/v1/pilot.proto` has `ReadOrganizationDetail`, `ReadOrganizationSettings`, `ReadOrganizationMembers`, `ReadProjectDetail`, `ReadProjectSettings`, `ReadProjectMembers`, `UpdateProject`, `EnrollProject`, `CancelEnrollProject`, and `ToggleFavoriteProject`, but no Wave 2A container RPCs.
- Legacy parity anchors for this packet are:
  - `yona-original/app/views/organization/header.scala.html`
  - `yona-original/app/views/organization/menu.scala.html`
  - `yona-original/app/views/organization/view.scala.html`
  - `yona-original/app/views/project/header.scala.html`
  - `yona-original/app/views/projectMenu.scala.html`
  - `yona-original/app/views/project/home.scala.html`
  - `yona-original/app/views/project/setting.scala.html`
  - `yona-original/app/views/project/partial_dashboard.scala.html`
- Existing persistence already exposes building blocks for authorization, favorites, member directories, watcher state, menu settings, and workspace member-project summaries.
- Shared prep results on 2026-04-11:
  - stale `ralph-wave1-account-integrate` worktree was clean with no local commits and was removed
  - stale `ralph-wave1-account-contract` had no local commits but was dirty (`yona-rust/frontend/dist/`) and was moved to `.codex-worktrees/archive-20260411-wave1/`
  - stale `ralph-wave1-account-backend` had an unmerged local commit (`4adb61e`) and was moved to `.codex-worktrees/archive-20260411-wave1/`
  - stale `ralph-wave1-account-frontend` had an unmerged local commit (`7dcb5c2`) and was moved to `.codex-worktrees/archive-20260411-wave1/`
- Wave 2A contract anchor is committed on `ralph/wave2a-container-contract` at `ab35d997b386450c536bcfe58e9f6e2b5a837e5e`.

## Constraints

- This is a parity-first conversion packet, not an architecture redesign.
- Wave 2A full-container scope is limited to home/header/menu/settings/summary blocks.
- Downstream issue/board/pull-request/code pages remain placeholder or out of scope for this packet.
- Existing detail/member RPCs stay in place; the new frontend home routes must treat the new container RPCs as the only source of truth.
- Stale `ralph-wave1-account-*` worktrees are not reused.
- No new dependencies.

## Likely Touchpoints

- `proto/yona/pilot/v1/pilot.proto`
- `frontend/src/gen/**`
- `frontend/src/auth-workspace-client.ts`
- `frontend/src/app-view-models.ts`
- `frontend/src/routes/-organization-views.tsx`
- `frontend/src/routes/-project-views.tsx`
- `frontend/src/routes/-view-models.ts`
- `frontend/src/routes/organizations/$organizationName/**`
- `frontend/src/routes/$owner/$projectName/**`
- `frontend/src/*.spec.tsx`
- `crates/server/src/lib.rs`
- `crates/server/tests/org_project_contract.rs`
- `crates/persistence/src/repo.rs`
- `crates/persistence/src/repo_types.rs`
- `crates/domain/src/org_project.rs`
