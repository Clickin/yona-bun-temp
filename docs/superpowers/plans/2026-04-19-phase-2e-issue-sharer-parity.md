# Phase 2E Issue Sharer Parity Implementation Plan

> Status: superseded by Phase -1 REST pivot
> This plan describes the pre-REST implementation packet. Treat its transport references as historical; current application work uses `/api/v1` REST and TanStack Query.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or direct TDD execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement legacy Issue Sharer parity for directly sharing a restricted/private issue with a user by login ID.

**Architecture:** Keep the feature inside the existing Rust repository + ConnectRPC + React issue detail route. `issue_sharer` rows store direct shares by `issue_id` and resolved `user_id`; projections join back to users for display labels. Parent issue shares grant child issue read-only access, while direct child shares are required for child comment creation.

**Tech Stack:** SeaORM persistence entities, ConnectRPC generated service/proto, React route components, existing cargo/pnpm verification.

---

## Revised Scope

- Implement user login ID based share and unshare for issue detail.
- Add direct sharer projection to `ReadIssueDetailResponse`.
- Add viewer flags that separate direct share, inherited parent share, sharer management, and comment eligibility.
- Allow directly shared users to read the issue/comments and create comments on that issue.
- Allow users who inherit access from a shared parent issue to read the child issue/comments only.
- Keep issue update/delete/state/assignee/label/milestone permissions unchanged for shared users.
- Keep project-level share, sharable user autocomplete/search, shared-with-me filters, timeline event emission, and notifications as documented follow-ups.

## Review Fixes Applied

- `viewer_is_shared` is split into `viewer_is_direct_sharer` and `viewer_has_inherited_share`; the frontend uses `viewer_can_comment`, not share status alone, to show the comment form.
- `ShareIssue` resolves `login_id` to `n4user.id` and stores direct rows in `issue_sharer(issue_id, user_id, login_id, created)`. Duplicate direct shares are idempotent by lookup on `issue_id + user_id`.
- `UnshareIssue` deletes the matching direct row when present and returns an unchanged refreshed issue detail when absent.
- Unauthorized share/unshare attempts return `PERMISSION_DENIED`.
- Explicit shares are row-based even if the user already has project read access; sharer count/list are based only on direct `issue_sharer` rows.
- Comment update/delete still require issue read access, so an unshared former commenter cannot mutate comments through an issue they can no longer read.

## Tasks

- [x] Add server contract tests for share/unshare, duplicate idempotency, unknown login, unauthorized mutation, direct shared read/comment, mutation denial, comment author boundaries, and parent-child read-only inheritance.
- [x] Extend proto with `IssueSharer`, `IssueShareRequest`, new `ReadIssueDetailResponse` fields, and `ShareIssue`/`UnshareIssue` RPCs.
- [x] Add persistence records and repository methods for listing direct sharers, reading share status, adding shares, and removing shares.
- [x] Replace issue read/comment authorization flow with issue-level access evaluation that allows project read or sharer read as appropriate.
- [x] Add server RPC handlers for `ShareIssue` and `UnshareIssue`, including CSRF/session validation and mutation-authority checks.
- [x] Regenerate frontend ConnectRPC TypeScript bindings.
- [x] Add frontend client helpers and issue detail UI for sharer count/list, login ID add, and delete controls.
- [x] Update frontend tests for shared viewer controls and manager sharer controls.
- [x] Update `SPEC.md` and `docs/provenance/phase-0b/issue.md` with implemented scope and follow-up gaps.
- [x] Run targeted tests first, then broader cargo/pnpm verification as time permits.
