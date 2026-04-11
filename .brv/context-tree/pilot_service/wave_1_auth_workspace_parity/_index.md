---
children_hash: db2251cc1dc8875f775f2cafa712c7e97b9c0a6e4af6bfe08516114ffa244bc4
compression_ratio: 0.5954198473282443
condensation_order: 1
covers: [context.md, wave_1_auth_workspace_parity.md]
covers_token_total: 1179
summary_level: d1
token_count: 702
type: summary
---
### wave_1_auth_workspace_parity (context.md)
- **Purpose:** Captures the end-to-end Wave 1 `/me` workspace parity effort, tying PilotService RPCs, persistence helpers, server runtime configuration, and frontend shells/tests into a legacy-facing dashboard/settings UX.
- **Key components:** PilotService workspace gRPC surface; persistence repo helpers for identity normalization, membership/project management, and workspace state building; frontend shells (auth workspace, settings, project directory) plus parity specs verifying legacy dashboard widgets, streams, and notification controls.
- **Relationships:** Links closely to `authentication/pilot_workspace_minimum/pilot_workspace_minimum.md` for broader workspace consistency requirements.

### Wave 1 Auth Workspace Parity (wave_1_auth_workspace_parity.md)
- **Task:** Document the `/me` parity implementation that integrates PilotService, persistence utilities, server runtime config, and frontend shells/tests.
- **Changes:** Extended `ReadWorkspaceOverview`, exposed workspace preference/management RPCs, structured persistence utilities for normalized data, and aligned frontend shells/tests with legacy action URLs.
- **Files:** Covers PilotService proto, persistence repo, server lib, frontend shells, and parity tests.
- **Flow:** ReadWorkspaceOverview RPC → persistence repo assembles profile/membership/issue/pull data → server runtime builds response → frontend shells render dashboard/settings and parity tests verify flows.
- **Structure & Highlighted Rules:** PilotService, persistence utils, server builders, and frontend shells collaborate to deliver dashboard, settings, notification toggles, and project filters; server config depends on normalized base path, PilotBackend repo, `YONA_AUTH_*` env vars, and persistence helpers. Auth flows require CSRF validation, overview rebuilds after mutations, password changes enforce identifier/old-password validation plus 8+ char new password, and parity tests cover legacy links/forms.
- **Facts (for drill-down):**
  - `wave1_me_dashboard`: Legacy dashboard contains profile card, social providers, member projects, issue/pull streams, and settings under `/user/editform`.
  - `pilotservice_rpc_surface`: PilotService exposes auth/session, workspace prefs, org/project CRUD, and issue RPCs to support workspace and directory actions.
  - `workspace_notifications_and_dashboard_window`: Notifications default enabled except NEW_COMMENT; overview sets `days_ago = 14`.
  - `workspace_state_refresh`: Each workspace mutation rebuilds `ReadWorkspaceOverviewResponse` to keep favorites, notifications, emails, tokens, and streams synchronized.

Refer to `context.md` and `wave_1_auth_workspace_parity.md` for detailed procedures, RPC definitions, files touched, and parity test expectations.