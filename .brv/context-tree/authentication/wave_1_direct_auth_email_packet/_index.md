---
children_hash: b1b8696e6ddf8136f7e609fc9c3c15ac26ee9363ed7835cd2c0905e38247ecc4
compression_ratio: 0.5757575757575758
condensation_order: 1
covers: [context.md, direct_auth_and_email_packet.md]
covers_token_total: 1188
summary_level: d1
token_count: 684
type: summary
---
### wave_1_direct_auth_email_packet (context.md)
- **Purpose:** Documents Wave 1 Rust implementation and validation surface for direct-auth flows, workspace email verification, and their frontend/audit context.
- **Server & Persistence Architecture:** Rust routers register session bootstrap plus lost-password, reset-password, workspace email send/confirm, and gRPC services; AppRepository helpers normalize identifiers, manage verification tokens, notifications, profiles, organizations, and workspace-overview projections.
- **Frontend & Contracts:** AuthWorkspaceShell composition (Login/Register/LostPassword/Reset/Home/Workspace shells) mirrors legacy redirects with CSRF-aware helpers; contract tests validate capability flags, registration/sign-in/reset journeys, email validation send/confirm, workspace settings mutations, notification toggles, and landing normalization.
- **Relations:** Ties to authentication/pilot_workspace_minimum and authentication/pilot_session_hardening for broader parity coverage.

### Direct Auth and Email Packet (direct_auth_and_email_packet.md)
- **Task & Scope:** Captures full Wave 1 direct authentication + workspace email packet in yona-rust, spanning server routes, persistence helpers, contract tests, frontend shells, and parity audit traceability.
- **Changes & Flow:** Adds normalized Rust server routing for session bootstrap, lost/reset password, email validation routes (send/confirm), and RPC endpoints; extends persistence for identifiers, verification tokens, notifications, profiles, and workspace projections; details AuthWorkspaceShell rendering; anchors flow through CSRF/session bootstrapping feeding frontend overview and parity audits.
- **Key Dependencies & Highlights:** Depends on RuntimeConfig, SessionManager, AppRepository, CSRF/session bootstrap, capability flags (YONA_AUTH_*), bcrypt, SeaORM models, workspace token helpers; parity audit keeps Wave 0 expectations aligned.
- **Facts:** Lists explicit endpoints (/api/auth/session, /lostPassword, /resetPassword, /user/email/sendValidationEmail/{email_id}, /user/email/confirm/{email_id}/{token}, RPC), workspace email send prerequisites (session, CSRF, numeric email_id), AuthWorkspaceShell component structure (Login/Register/LostPassword/Reset/Home/Workspace shells with legacy redirects), and comprehensive contract test coverage of capability flags, auth flows, email validation, settings mutations, notifications, and default landing normalization.
- **Files for Drilldown:** `yona-rust/crates/server/src/lib.rs`, `yona-rust/crates/persistence/src/repo.rs`, `yona-rust/crates/server/tests/auth_workspace_contract.rs`, `yona-rust/frontend/src/auth-workspace-shell.tsx`, `docs/provenance/core-parity-audit.md`.