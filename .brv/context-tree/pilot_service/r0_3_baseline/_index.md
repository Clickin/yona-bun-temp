---
children_hash: 68d0b5ecdaf52ed53b13fb1ca19379e387c5e9981e7d2ac45def2926306f2152
compression_ratio: 0.6189349112426036
condensation_order: 1
covers: [context.md, pilot_r0_3_baseline_features.md]
covers_token_total: 845
summary_level: d1
token_count: 523
type: summary
---
# R0-3 Pilot Baseline (domain-level summary)

- **context.md**
  - Describes the R0-3 pilot baseline covering the org/project proto surface, Axum/Connect server helpers, and frontend AuthWorkspaceShell wiring.
  - Highlights session handling, workspace overview refresh, and CRUD lifecycle across pilot service layers.
  - Points readers to `@release/pilot_rust_baseline/pilot_rust_baseline.md` for broader baseline alignment.

- **pilot_r0_3_baseline_features.md**
  - Documents the baseline task of delivering PilotService RPCs, server helpers, and frontend wiring before later waves.
  - Outlines changes across:
    - `yona-rust/proto/yona/pilot/v1/pilot.proto` defining RPCs for session reads, auth capabilities, workspace overview, org/project CRUD, enrollments, favorites, recent visits, and issue updates.
    - `yona-rust/crates/server/src/lib.rs` implementing session bootstrap, CSRF validation, workspace list loaders, and authorization helpers used by Axum/Connect handlers.
    - `yona-rust/frontend/src/App.tsx` wiring workspace bootstrapping, route loaders, and AuthWorkspaceShell callbacks to keep navigation and workspace state synchronized after auth or enrollment events.
  - Flow: app bootstrap fetches session/CSRF/workspace overview → route loaders call PilotService → server validates/auths/persists → frontend updates workspace/favorites/navigation via AuthWorkspaceShell.
  - Dependencies include Axum, Connect, runtime config normalizers, session manager helpers, PilotRepository persistence, authorization utilities, generated Pilot API client, and AuthWorkspaceShell view models.
  - Highlights emphasize CSRF-protected mutators, org/project CRUD, workspace refreshes, and responsiveness to favorites, enrollments, default path updates, and navigation choices.
  - Facts capture the expanded PilotService RPC surface and App.tsx workflow for session/workspace orchestration.

Drill down into `context.md` for the high-level baseline overview and into `pilot_r0_3_baseline_features.md` for detailed task, changes, flow, dependencies, highlights, and explicit facts.