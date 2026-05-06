# Phase -1: refactor temp development

Status: active planning

## Purpose

Refactor the existing temporary implementation to match the REST pivot SPEC before starting the next new feature phase.

This phase accepts that existing ConnectRPC/proto-based work can be rewritten. The goal is not to preserve the current transport implementation. The goal is to preserve legacy Yona functional/UX parity while moving the canonical application API to `/api/v1` REST JSON and the frontend server-state boundary to TanStack Query.

## Scope

- Rebaseline documents and provenance so they no longer treat ConnectRPC/proto as the future canonical application API.
- Introduce or promote a REST API layer under `/api/v1` for existing implemented application flows.
- Introduce frontend typed API client and TanStack Query provider/hooks as the default data boundary.
- Migrate implemented application flows from ConnectRPC wrappers to REST-backed query/mutation hooks.
- Keep legacy direct routes only where they represent Play form/deep-link compatibility.
- Keep `/-_-api/v1/**` separate as legacy external API compatibility, implemented only with legacy external-tool evidence.
- Remove ConnectRPC/proto dependencies after the migrated flows and tests no longer need them, or quarantine them as transition-only with an explicit removal checklist.

## Initial Refactor Packets

1. Contract baseline
   - Define `/api/v1` error envelope, CSRF/session behavior, bigint/date serialization policy, and pagination/filter conventions.
   - Add server contract tests for the baseline.

2. Frontend API baseline
   - Add shared REST fetcher, typed response/request helpers, and TanStack Query provider.
   - Add query key factories for session, workspace, project, issue, labels, milestones, and code browser.

3. Auth/workspace/project migration
   - Replace session/auth/workspace/project ConnectRPC calls with REST endpoints and query hooks.
   - Preserve legacy route UX and existing Playwright smoke coverage.

4. Issue/label/milestone migration
   - Replace issue CRUD, comments, watch/vote/favorite/share/assignee, labels/categories, and milestones with REST endpoints.
   - Preserve legacy direct mutation routes only as compatibility adapters over the same domain/service layer.

5. Code browser migration
   - Replace `ReadCodeBrowser` with REST endpoints for tree/blob/listing reads.
   - Keep raw/download/image/history/Smart HTTP as explicit follow-ups unless implemented in this phase.

6. RPC retirement decision
   - Remove generated frontend ConnectRPC clients and server registration if no migrated flow needs them.
   - If removal is too large for this phase, document the remaining RPC calls and assign a removal packet before any new feature phase.

## Exit Criteria

- `SPEC.md`, `AGENTS.md`, `README.md`, `docs/agents/*`, and relevant provenance docs consistently describe REST + TanStack Query as canonical.
- Existing implemented user-visible flows work through `/api/v1` REST endpoints.
- Frontend server state uses TanStack Query rather than ad hoc ConnectRPC wrappers.
- Legacy direct routes and legacy external REST routes are clearly separated from the application REST API.
- Tests cover the migrated flows at REST contract, route authorization, frontend unit, and Playwright smoke levels.
- No new feature phase begins while ConnectRPC remains an unscoped dependency for implemented application flows.
