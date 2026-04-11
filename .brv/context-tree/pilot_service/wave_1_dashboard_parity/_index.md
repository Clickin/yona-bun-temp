---
children_hash: 850e9568b8de68b38dad080cb2b851d59f6120896882d8d92c86c73c86ad0acb
compression_ratio: 0.257985257985258
condensation_order: 1
covers: [context.md, wave_1_me_dashboard_packet_overview.md, wave_1_me_dashboard_update.md]
covers_token_total: 2035
summary_level: d1
token_count: 525
type: summary
---
# Wave 1 Dashboard Parity (Pilot Service)

- **Scope & Architecture**
  - Captures the Rust-based PilotService /me dashboard parity across gRPC payloads, server runtime, persistence helpers, frontend shells, and provenance audit tracking (see `context.md` for overarching relationships and drift vocabulary).
  
- **gRPC & Runtime Surface**
  - `pilot.proto` exposes RPCs for session/auth/workspace/favorites/enrollment/issues/notifications with payloads like `ReadCurrentSessionResponse` and `ReadWorkspaceOverviewResponse`, ensuring workspace overviews rebuild after profile/auth mutations (`wave_1_me_dashboard_update.md`).
  - Server runtime routers normalize base paths, enforce CSRF/session guards, rely on workspace helpers/persistence utilities, and use `WORKSPACE_DAYS_AGO = 14` when assembling dashboard responses (`wave_1_me_dashboard_update.md`).

- **Persistence & Helper Utilities**
  - Repositories handle identity normalization, workspace notification defaults, random tokens, and workspace-specific queries for favorites, recent projects/issues/PRs, and notification types feeding the dashboard packet (`wave_1_me_dashboard_update.md`).

- **Frontend Shells & Payload Flow**
  - Wave 1 `/me` dashboard packet orchestrates filtered workspace overview streams (issues, PRs, member projects) with daysAgo/ACL filters, bundles enriched user card/profile metadata, and renders via the Rust `/me` shell (`wave_1_me_dashboard_packet_overview.md`).
  - Frontend auth/workspace shells cover login/register/workspace/settings/project directory views, wiring view models, href builders, pagination, notification toggles, and preserving existing setting mutations while some flows (email validation/avatar uploads) remain unresolved (`wave_1_me_dashboard_update.md`).

- **Provenance Audit**
  - The provenance audit (`docs/provenance/core-parity-audit.md`) freezes the Wave 0 parity baseline, tracks statuses (parity, semantic-drift, missing, deferred-2nd-priority), and provides an exit checklist for runtime/router readiness, test suites, and directory feeds (`wave_1_me_dashboard_update.md`).