---
children_hash: e12589711501fa6cf8ac67ecdcf2c50a0fa45f990d9a30a848e7e3d5bee76f7b
compression_ratio: 0.49326871297792135
condensation_order: 2
covers: [context.md, r0_3_baseline/_index.md, wave_0_route_foundation/_index.md, wave_1_auth_workspace_parity/_index.md, wave_1_dashboard_parity/_index.md, wave_1_workspace_parity/_index.md]
covers_token_total: 3714
summary_level: d2
token_count: 1832
type: summary
---
# Domain Overview: `pilot_service`
- **Purpose**: Catalogs the baseline PilotService backend, RPC definitions, server helpers, and AuthWorkspaceShell wiring that underpin the initial org/project workflows and workspace surface prior to later enrollment and public directory waves.
- **Scope & Ownership**: Includes PilotService proto RPCs (session, workspace, organization/project CRUD, enrollments, favorites, notifications, issues) plus Axum/Connect server runtime components and frontend AuthWorkspaceShell synchronization logic; owned by Pilot Infrastructure.

# Topic Summaries (Level d2)

## `pilot_service/r0_3_baseline`
- **Content Focus**: Baseline delivery of PilotService RPC surface, Axum/Connect server helpers, and frontend AuthWorkspaceShell bootstrap handling across sessions, workspace overviews, favorites, and navigation updates.
- **Key Flow**: App bootstrap → fetch session/CSRF/workspace overview → PilotService route handlers validate/auth/persist → front-end loaders and AuthWorkspaceShell callbacks refresh workspaces, favorites, and navigation on enrollments or org/project CRUD.
- **Dependencies & Highlights**: Proto definitions under `yona-rust/proto/.../pilot.proto`, server impl in `yona-rust/crates/server/src/lib.rs`, frontend wiring in `yona-rust/frontend/src/App.tsx`; emphasizes CSRF-protected mutators, workspace refresh cycles, and frontend responsiveness to workspace state changes.

## `pilot_service/wave_0_route_foundation`
- **Canonical Routing**: Frontend uses a single canonical route table to remap legacy home/auth/directory/search/project URLs; reserved prefixes guide legacy handler invocation while preserving pagination and workspace shell behavior.
- **PilotService & Server Role**: PilotService (via `pilot.proto`) exposes RPCs covering session/auth, workspace overview, organization/project CRUD, issues, enrollments, and favorites; Axum + Connect routers wire API/session bootstrap, asset handlers, config serialization, and support `/orgs` listing responses.
- **Persistence & Workspace Shell Integration**: Repository logic normalizes AppUser/Organization/Project/Issue data, enforces authorization scopes, tracks membership/enrollment/favorites, and refreshes default landing metadata; route-table utilities feed AuthWorkspaceShell render logic to keep login/register/home/directory/placeholder views and redirects consistent with back-end state.

## `pilot_service/wave_1_auth_workspace_parity`
- **Wave Objective**: Achieve `/me` workspace parity by aligning PilotService RPC surface, persistence helpers, runtime config, AuthWorkspaceShell, and parity tests with legacy dashboard/settings behaviors.
- **Key Enhancements**: Extended `ReadWorkspaceOverview` and workspace preference RPCs; normalized persistence helpers for identity, membership, projects, notifications, favorites, emails, and token metadata; frontend shells/driven parity tests verifying legacy widgets, streams, and notification toggles.
- **Rules & Dependencies**: Runtime depends on normalized base path, `YONA_AUTH_*` env flags, CSRF/session validation, overview rebuilds after mutations, and password-change validation rules (identifier + old password, 8+ char new password); notifications default to all enabled except `NEW_COMMENT`.
- **Facts for Drill-down**: Legacy dashboard `/me` collects profile, provider info, member projects, plus issue/PR streams; RPC surface supports auth/session/workspace/org/project/issue actions; overview refreshes on workspace mutations to keep favorites, notifications, emails, tokens, and streams in sync.

## `pilot_service/wave_1_dashboard_parity`
- **Structural Goal**: Document Rust-based `/me` dashboard parity—gRPC payloads, runtime routing, persistence helpers, frontend shells, and provenance audit.
- **gRPC & Runtime Surface**: `pilot.proto` defines session/auth/workspace/favorites/enrollments/issues/notifications RPCs with payloads like `ReadCurrentSessionResponse`/`ReadWorkspaceOverviewResponse`; server routers normalize base paths, enforce CSRF/session guards, and use `WORKSPACE_DAYS_AGO = 14`.
- **Frontend & Persistence Linkage**: Persistence repos feed identity normalization, notifications defaults, tokens, and workspace streams to the dashboard packet; frontend shells orchestrate notifications, filters, pagination, and parity-driven UI, while some flows (email validation/avatar uploads) remain pending.
- **Provenance Audit**: `docs/provenance/core-parity-audit.md` preserves Wave 0 parity baseline, documents parity/drift status, and lists readiness checkpoints for routers, runtimes, tests, and directory feeds.

## `pilot_service/wave_1_workspace_parity`
- **Scope**: Captures Wave 1 workspace parity across proto/API, persistence, server runtime, frontend shells, and provenance audit, always referencing the legacy Wave 0 baseline.
- **Proto & API**: `ReadWorkspaceOverview` now includes session/auth data, landing path, favorites/recents, watched projects, emails, API tokens, profile/provider metadata, issue/PR/project streams with `daysAgo` tagging, and notification preferences.
- **Persistence Enhancements**: Repositories store notifications, emails, tokens, favorites, recents, profile metadata, and workspace streams; normalize identities and authorization metadata; default notification types disable `NEW_COMMENT` unless overridden.
- **Server & Frontend Orchestration**: Server (`yona-rust/crates/server/src/lib.rs`) handles CSRF/session guards, env-based `YONA_AUTH_*` flags, bcrypt password hashing, normalized identifiers, and overview refresh post-mutation; frontend shells (`auth-workspace-shell.tsx`) reuse enriched overview data to render legacy dashboard, settings, and project directory views with helper utilities.
- **Flow Summary**: Client calls `ReadWorkspaceOverview` → persistence aggregates favorites/recents/notifications/emails/tokens/streams → server loads settings and enforces auth flags → frontend renders legacy workspace and logs parity status in provenance audit.
- **Callouts for Exploration**: See child files for details on workspace notification defaults, overview enrichment, RPC surface, frontend shell flows, and the provenance audit matrix linking drift vocabulary and exit checklist.

# Structural Relationships and Drill-down Paths
- **Baseline → Wave 0**: `r0_3_baseline` provides the foundational PilotService RPC/handler surface referenced by `wave_0_route_foundation` routing logic and later parity efforts.
- **Route Foundations → Workspace Parity**: `wave_0_route_foundation`’s canonical routing utilities and repositories feed AuthWorkspaceShell rendering, enabling `wave_1_workspace_parity` to layer enriched workspace overviews and notification handling.
- **Wave 1 Layers**: `wave_1_auth_workspace_parity`, `wave_1_dashboard_parity`, and `wave_1_workspace_parity` interlock: RPC/persistence/server expansions support the `/me` dashboard parity packet, which the frontend shells consume, while provenance audits track drift back to the baseline.
- **Drill-down References**: Consult each child entry (`context.md`, `_index.md`, and detailed topic files like `pilot_r0_3_baseline_features.md`, `wave_0_canonical_routing_update.md`, `wave_1_me_dashboard_packet_overview.md`, etc.) for concrete facts, file paths, and architectural specifics aligning with the summary above.