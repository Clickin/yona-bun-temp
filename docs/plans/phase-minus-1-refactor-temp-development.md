# Phase -1: refactor temp development

Status: complete on `codex/phase-minus-1-integration`

## Purpose

Refactor the existing temporary implementation to match the REST pivot SPEC before starting the next new feature phase.

This phase accepted that existing ConnectRPC/proto-based work could be rewritten. The goal was not to preserve the temporary transport implementation. The goal was to preserve legacy Yona functional/UX parity while moving the canonical application API to `/api/v1` REST JSON and the frontend server-state boundary to TanStack Query.

## Scope

- Rebaseline documents and provenance so they no longer treat ConnectRPC/proto as the future canonical application API.
- Introduce or promote a REST API layer under `/api/v1` for existing implemented application flows.
- Introduce frontend typed API client and TanStack Query provider/hooks as the default data boundary.
- Migrate implemented application flows from ConnectRPC wrappers to REST-backed query/mutation hooks.
- Keep legacy direct routes only where they represent Play form/deep-link compatibility.
- Keep `/-_-api/v1/**` separate as legacy external API compatibility, implemented only with legacy external-tool evidence.
- Remove ConnectRPC runtime/frontend dependencies after the migrated flows and tests no longer need them. Keep `proto/` only as a historical message schema snapshot.

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
   - Completed: generated frontend ConnectRPC clients/dependencies and server `/rpc` registration were removed.
   - Completed: server proto build now generates message types without `connectrpc-build`; no runtime ConnectRPC dependency remains.
   - Test-only note: debug builds expose `/api/v1/_pilot/{method_name}` as a local compatibility harness for old contract tests. It is not the application contract and must not be used by frontend/runtime code.

## Exit Criteria

- `SPEC.md`, `AGENTS.md`, `README.md`, `docs/agents/*`, and relevant provenance docs consistently describe REST + TanStack Query as canonical.
- Existing implemented user-visible flows work through `/api/v1` REST endpoints.
- Frontend server state uses TanStack Query rather than ad hoc ConnectRPC wrappers.
- Legacy direct routes and legacy external REST routes are clearly separated from the application REST API.
- Tests cover the migrated flows at REST contract, route authorization, frontend unit, and Playwright smoke levels.
- No runtime ConnectRPC or frontend ConnectRPC dependency remains for implemented application flows.

## Final Endpoint Evidence

- REST foundation: `GET /api/v1/session`, `GET /api/v1/auth/capabilities`, shared REST error envelopes, CSRF header policy, typed frontend `restFetch`, query keys, and Query provider.
- Auth/workspace: `/api/v1/auth/*`, `/api/v1/workspace`, `/api/v1/workspace/emails/*`, `/api/v1/workspace/notifications`, `/api/v1/workspace/recent-projects`.
- Organization/project: `/api/v1/projects`, `/api/v1/organizations`, `/api/v1/organizations/:organizationName/**`, `/api/v1/owners/:ownerName/projects/:projectName/**`.
- Issues: `/api/v1/projects/:ownerName/:projectName/issues/**`, `/api/v1/organizations/:organizationName/issues`, `/api/v1/user/issues`, `/api/v1/owners/:ownerName/projects/:projectName/issues/:issueNumber/**`.
- Labels/milestones: `/api/v1/owners/:ownerName/projects/:projectName/labels/**`, `/api/v1/owners/:ownerName/projects/:projectName/milestones/**`.
- Code browser: `GET /api/v1/projects/:ownerName/:projectName/code`.

## Completion Evidence

- `rg -n "createConnectTransport|createPilotClient|@connectrpc|/rpc/yona\\.pilot|connectrpc|rpcBaseUrl|VITE_YONA_RPC_BASE_URL|/rpc" frontend crates` returns no matches on the integration branch after production build output is regenerated.
- `cargo test -p yoram-server --test router_contract --test db_router_contract --test rest_contract --test auth_workspace_contract --test org_project_contract --test assets_contract --test issue_core_contract --test issue_label_contract --test issue_sharer_contract --test issue_comment_vote_contract --test milestone_contract --test organization_issue_contract --test user_issue_favorite_contract --test code_browser_contract --test runtime_config_contract` passed on the integration branch.
- `cargo test --workspace` passed on the integration branch, including `crates/server/tests/db_matrix_testcontainers.rs` testcontainers coverage.
- `pnpm --dir frontend check` passed on the integration branch.
- `pnpm --dir frontend test` passed on the integration branch: 10 files, 72 tests.
- `pnpm --dir frontend test:e2e` passed on the integration branch: 12 tests.
- `pnpm --dir frontend build` passed on the integration branch.
- Follow-up closeout audit removed stale current-doc/script/test references from `docs/shared/protobuf-codegen.md`, `proto/README.md`, `scripts/smoke-embedded-assets.ps1`, and `tests/precommit-hook-contract.test.mjs`.
- `pwsh -NoProfile -File scripts\smoke-embedded-assets.ps1` passed with embedded assets and REST `/api/v1/projects` smoke coverage.
