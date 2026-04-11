---
children_hash: 122a4c93167c5b30b7f011c06f293dfcba564326a2f5425fbf09f4e4be063570
compression_ratio: 0.44490216271884653
condensation_order: 1
covers: [context.md, wave_1_workspace_parity.md, wave_1_workspace_parity_overview.md]
covers_token_total: 1942
summary_level: d1
token_count: 864
type: summary
---
# Wave 1 Workspace Parity (pilot_service/wave_1_workspace_parity)
- **Scope**: Captures Wave 1 parity for PilotService workspaces across proto, persistence, server, frontend, and provenance layers, linking each artifact to the legacy Wave 0 baseline and Rust migration audit.
- **Key Enhancements**:
  - **Proto & API** (`yona-rust/proto/yona/pilot/v1/pilot.proto`): ReadWorkspaceOverview now surfaces session/auth data, default landing path, favorites/recents, watched projects, emails, API tokens, profile/provider metadata, and issue/PR/project streams with `daysAgo` tagging.
  - **Persistence** (`yona-rust/crates/persistence/src/repo.rs`): Stores notifications, emails, landing path, tokens, favorites, recents, profile/stream aggregates, and WORKSPACE_NOTIFICATION_TYPES defaulting off NEW_COMMENT; includes normalized identity helpers and authorization metadata.
  - **Server** (`yona-rust/crates/server/src/lib.rs`): Hooks into CSRF/session guards, env-based capability flags (YONA_AUTH_*), bcrypt password handling, and runtime helpers that aggregate workspace lists/settings, normalize identifiers, enforce auth capability flags, and refresh overview after mutations.
  - **Frontend** (`yona-rust/frontend/src/auth-workspace-shell.tsx`): Legacy workspace/profile/notification/email/token shells reuse the enriched overview, drive login/register/workspace/settings/project directory flows, and consume view models with href builders, pagination helpers, and workspace notification toggles.
  - **Provenance Audit** (`docs/provenance/core-parity-audit.md`): Freezes Wave 0 parity baseline, maps legacy UX/routes to canonical Rust behaviors, tracks drift vocabulary, owner mapping, audit matrix, and exit checklist.
- **Flow (ReadWorkspaceOverview request)**:
  1. Client requests workspace overview.
  2. Persistence aggregates favorites, recents, notifications, emails, landing path, API token, and streams.
  3. Server loads project lists/settings, honors auth flags, and returns enriched payload.
  4. Frontend shells render legacy UX with new data; provenance audit logs parity completion.
- **Dependencies**: Server requires CSRF/session helpers, normalized base paths, WORKSPACE_DAYS_AGO = 14, bcrypt, and persistence helpers; frontend shells depend on auth/workspace view models and helper utilities.
- **Facts to Drill Down**:
  - **workspace_overview_extensions** & **workspace_overview**: ReadWorkspaceOverview payload now spans notifications, emails, tokens, streams, providers, and legacy profile fields.
  - **workspace_notifications** & **workspace_settings_data_load**: Persistence exposes normalized identity data, default notification states, and loads workspace settings data before rendering settings shell.
  - **new_comment_notification_default**: NEW_COMMENT notifications disabled by default unless overrides exist.
  - **pilot_service_rpc** & **frontend_shells**: RPC surface includes session/auth/workspace/org/project/favorites/enrollment/issues/notifications; frontend shells drive dashboard/settings/project directory features with capability awareness.
- **Related Topics for Details**:
  - `pilot_service/wave_0_route_foundation` (legacy routes foundation)
  - `pilot_service/r0_3_baseline` (PilotService feature baseline)
  - Each child entry (context.md, wave_1_workspace_parity.md, wave_1_workspace_parity_overview.md) holds the detailed architectural, dependency, and fact information above for deeper exploration.