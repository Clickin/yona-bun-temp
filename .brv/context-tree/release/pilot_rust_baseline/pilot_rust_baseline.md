---
title: Pilot Rust Baseline
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-07T14:14:47.981Z'
updatedAt: '2026-04-07T14:14:47.981Z'
---
## Raw Concept
**Task:**
Document the R0-3 pilot Rust org/project baseline release

**Changes:**
- Delivered the R0-3 Rust org/project baseline in yona-rust
- Exposed PilotService Connect RPCs with domain validation and persistence/migration flows for organizations and projects
- Surface workspace overview with factual favorite/recent lists and default landing preference persistence
- Frontlined org/project create/detail/settings flows via App.tsx workspace shell actions
- Recorded provenance traceability from legacy Java project tests to the Rust implementation targets

**Files:**
- yona-rust/proto/yona/pilot/v1/pilot.proto
- yona-rust/crates/server/src/lib.rs
- yona-rust/crates/persistence/src/repo.rs
- yona-rust/frontend/src/App.tsx
- docs/provenance/phase-0b/project.md

**Flow:**
gRPC PilotService proto defines the endpoints -> server runtime/session helpers enforce CSRF and project scope validation while shaping workspace payloads -> persistence repo normalizes identities and persists organizations/projects/memberships plus favorites/recents/default landing -> frontend App.tsx drives the workspace shell workflow and action handlers -> provenance document ties legacy tests to the rust artifacts and surfaces remaining gaps

**Timestamp:** 2026-04-06

**Author:** Pilot Release Team

## Narrative
### Structure
The R0-3 pilot baseline narrative ties together the PilotService proto, server runtime helpers, persistence repo, frontend workspace shell, and provenance tracing so engineers can follow org/project flows from API call to UI action.

### Dependencies
This release depends on the yona-rust runtime_config, persistence and domain crates, Connect RPC transport, database persistence, CSRF/session headers, and the frontend runtime-config plus workspace shell components that orchestrate the API surface.

### Highlights
Workspace overview now returns real favorite and recent project lists, project detail records recent visits for authenticated readers, favorite toggles stay workspace-local, and deferred scope calls out org enrollment workflow, public directories, deeper project routes, and broader project management surfaces as future work.

## Facts
- **baseline_delivery**: R0-3 Rust org/project baseline landed in yona-rust with Connect RPCs, domain validation rules, and persistence/migration flows for organizations, memberships, enrollment, favorites, and recent projects. [project]
- **pilotservice_api**: The PilotService gRPC API in yona-rust/proto/yona/pilot/v1/pilot.proto exposes workspace overview, organization and project CRUD, enrollment (enroll/cancel), favorites, recents, issue detail, and issue state update endpoints. [project]
- **server_structure**: yona-rust/crates/server/src/lib.rs composes persistence, runtime_config, and session modules, configures routers and asset modes, bootstraps CSRF/session headers, and supplies workspace helpers that map persistence records into API DTOs. [project]
- **persistence_repo**: yona-rust/crates/persistence/src/repo.rs normalizes identities, exposes user/organization/project CRUD, manages memberships, enrollment requests, favorites, recent visits, default landing paths, and repository wrappers for user and landing helpers. [project]
- **frontend_workspace**: yona-rust/frontend/src/App.tsx maintains workspace state (route, overview, session, CSRF token, error/pending flags), loads route-specific organization/project data, and exposes actions for create/enroll/toggle favorite/update flows before refreshing workspace overview. [project]
- **provenance_mapping**: docs/provenance/phase-0b/project.md maps legacy Java project/organization/enrollment/workspace tests to canonical Rust targets, defines the baseline scope (create/read/update, visibility enforcement, enrollment request/cancel, workspace favorite/recent/default landing semantics), and catalogs gaps (delete, transfer, org enrollment management, workspace settings/default landing UX, member management beyond read-only, watchers/webhooks/statistics). [project]
