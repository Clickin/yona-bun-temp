---
children_hash: a6ba20e591dfa8f24cbb82ae4ad8cfb57a2132dd6b5c5c1d9f2e329cf192dacd
compression_ratio: 0.5801376597836775
condensation_order: 1
covers: [context.md, pilot_auth_workspace_minimum.md]
covers_token_total: 1017
summary_level: d1
token_count: 590
type: summary
---
## pilot_auth_workspace_minimum (context.md)
- **Domain focus:** Baseline pilot authentication and workspace delivery for the Yona Rust pilot, covering end-to-end flow from protobuf RPCs through server helpers, persistence, and frontend shells.
- **Key components:** PilotService RPC surface handling session/auth/workspace operations; session bootstrap/CSRF payload delivery; SeaORM-backed persistence for app_users and default landing preferences; connect-web + buf-generated TypeScript clients powering /login, /register, and /me shells.

## Pilot Auth Workspace Minimum (pilot_auth_workspace_minimum.md)
- **Task:** Document the pilot auth/workspace minimum, including RPC contracts, server flows, persistence, and frontend shells.
- **Changes:** Defined protobuf surface with helper RPCs and static fallbacks, implemented server routing/session bootstrapping/persistence handlers, and added frontend auth workspace client utilities with /login, /register, /me shells.
- **Files & Flow:** Proto definition located at `proto/yona/pilot/v1/pilot.proto`; runtime config feeds session bootstrap payload, PilotService RPCs enforce CSRF/session requirements and default landing normalization, persistence updates landing paths, and frontend shells orchestrate experiences with runtime-config aware redirects.
- **Structure & Dependencies:** Axum routing, Connect/connect-web transport, bcrypt, SeaORM repos (app_users/default_landing/preferences/projects/issues), Buf-generated TypeScript schemas, runtime config normalization, and BrowserRuntimeConfig injection support the flow; PilotServiceImpl uses helper methods for session bootstrapping, identifier normalization, password verification, CSRF headers, and default landing wrapping.
- **Highlights & Facts:** `/api/auth/session` endpoint seeds CSRF tokens, session cookies, and runtime config; default landing paths normalized via persistence before appearing in session/workspace responses; connect-web client configuration reused across login/register/workspace shells; PilotService RPCs exposed (ReadCurrentSession, ReadAuthUiCapabilities, SignInWithPassword, RegisterWithPassword, SignOut, ReadWorkspaceOverview, SetDefaultLandingPath, ListProjects, ReadIssueDetail, UpdateIssueState); SeaORM tables persist user credentials and landing preferences; frontend shells rely on CSRF-aware PilotService calls.