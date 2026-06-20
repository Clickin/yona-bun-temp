# Runtime Config DI Inventory

Status: current

Last updated: 2026-06-21

This inventory is the working queue for removing request/test-time runtime
configuration access through process environment mutation. Before starting a
new runtime-config DI slice, consult this document first and update it after the
slice lands instead of re-running broad repository searches every turn.

## Target End State

- Runtime behavior receives config from explicit app/service DI snapshots such
  as `AppRuntimeConfig`, `RuntimeRegistry`, `RepositoryConfig`, or integration
  delivery config structs.
- Contract tests that need non-default config define it per test through those
  structs.
- Contract tests do not serialize on process-global env locks just to isolate
  runtime config.
- Startup env parsing remains centralized in `runtime_config.rs`; tests that
  intentionally verify startup env parsing are tracked separately from route or
  service parity tests.

## Current Queue

| Priority | Area | File | Current env/config shape | Recommended next move |
| --- | --- | --- | --- | --- |
| done | Issue/core data root | `crates/server/tests/issue_core_contract.rs` | Converted. The issue webhook contract tests now use `AppRuntimeConfig.data_root` per test. | No remaining runtime config env lock in this file. |
| done | Project webhook data root | `crates/server/tests/project_webhook_contract.rs` | Converted. The project webhook contract tests now use `AppRuntimeConfig.data_root` per test. | Runtime config env lock removed; shared webhook outbox serialization is explicit through an outbox-only test lock. |
| done | Search data root | `crates/server/tests/search_contract.rs` | Converted. Search contract tests now use `AppRuntimeConfig.data_root` per test. | Runtime config env lock removed; search assertions were left unchanged. |
| done | SVN protocol data root | `crates/server/tests/svn_protocol_contract.rs` | Converted. SVN protocol tests now use `AppRuntimeConfig.data_root` per test. | Runtime config env lock removed; executable availability skips remain unchanged. |
| done | Auth/workspace runtime config | `crates/server/tests/auth_workspace_contract.rs` | Converted. Auth UI, SMTP sender, and site-name route behavior tests use explicit `AppRuntimeConfig`; process env mutation, read-only env assertions, and `auth_env_lock` were removed. | Shared mail delivery assertions use `auth_outbox_lock` only for the test outbox. |
| done | Site admin SMTP/runtime config | `crates/server/tests/site_admin_contract.rs` | Converted. Site-admin SMTP and upload-limit route behavior tests use explicit `AppRuntimeConfig`; process env mutation, read-only env assertions, and `smtp_env_lock` were removed. | No runtime-config process env reads remain in this contract file. |
| done | Notification mail runtime config | `crates/server/tests/notification_contract.rs` | Converted. Notification scheduler and delivery tests use startup snapshot maps and explicit `NotificationMailDeliveryConfig`; process env mutation, read-only env assertions, and `notification_mail_env_lock` were removed. | Shared mail delivery assertions use `notification_outbox_lock` only for the test outbox. |
| done | Project transfer mail config | `crates/server/tests/project_transfer_contract.rs` | Converted. Project transfer mail tests use explicit `AppRuntimeConfig.smtp`; process env mutation and restore helper were removed. | Shared transfer-mail assertion uses a test outbox lock only for the outbox. |
| done | Integrations env-backed convenience functions | `crates/integrations/src/lib.rs` | Converted. Server runtime mail and webhook paths use injected `IntegrationConfig` snapshots and `*_with_config` APIs; env-backed helpers remain compatibility wrappers with no server runtime call sites. | Startup config now snapshots SMTP/webhook integration keys once, and notification/site-admin/auth/workspace/project-transfer mail paths receive the app-scoped snapshot. |
| done | Remaining read-only env assertions | `crates/server/tests/{auth_workspace,org_project,site_admin,mailbox,notification}_contract.rs` | Converted. Tests now prove runtime/startup snapshot behavior through returned payloads, persisted state, or config structs instead of comparing process env before/after. | No process-env reads remain in these runtime-config contract tests. |
| done | Startup compatibility env bridge | `crates/server/src/runtime_config.rs`, `crates/server/src/main.rs`, `crates/server/tests/runtime_config_contract.rs` | Removed. Production startup no longer writes parsed runtime config back into process env; `runtime_config_contract` no longer serializes process env mutation. | Startup still reads process env once through `load_startup_config_from_env`; runtime config then flows through `AppRuntimeConfig`, `RepositoryConfig`, scheduler configs, and integration delivery config. |
| done | Auth lost-password runtime config parameter threading | `crates/server/src/routes/auth.rs` | Converted. `direct_request_reset_password_email` receives the app-scoped `PilotServiceImpl` instead of separate session/backend/base-path/public-origin/site-name/SMTP/integration config parameters. | `PilotServiceImpl` now carries `site_name`; direct lost-password mail uses the same service snapshot as REST/auth registration paths. |
| done | Workspace email-validation SMTP parameter threading | `crates/server/src/routes/workspace.rs` | Converted. `direct_send_workspace_email_validation` uses `PilotServiceImpl.smtp` and no longer receives a separate default-from snapshot from route registration. | Direct workspace email-validation mail now uses the same service snapshot as the rest of the workspace route group. |
| done | Site-admin mail SMTP/integration parameter threading | `crates/server/src/routes/site_admin.rs` | Converted. REST and direct site-admin test-mail paths use `PilotServiceImpl.smtp` and `PilotServiceImpl.integrations` instead of separately cloned `SmtpRuntimeConfig` and `IntegrationConfig` parameters. | `site_admin_contract::site_admin_mail_send_and_recipient_lookup_follow_legacy_surface` covers REST and direct mail envelope parity. |
| done | Site-admin update/import config parameter threading | `crates/server/src/routes/site_admin.rs` | Converted. Site-admin REST/direct route registration and import/update handlers now use `PilotServiceImpl.site_update` and `PilotServiceImpl.max_uploaded_file_size` instead of separate `SiteUpdateConfig` or max-upload runtime config parameters. | `site_admin_contract` update/download/import max-size tests cover the per-router app config behavior. |
| done | Issue webhook integration parameter threading | `crates/server/src/routes/issues.rs`, `crates/server/src/routes/issues/comments.rs` | Converted. Issue REST/direct route registration now receives `PilotServiceImpl`, and issue create/update/state/delete/mass-update/comment-create webhook paths read `public_origin` and `integrations` from the app-scoped service snapshot instead of separate runtime config parameters. | `issue_core_contract` webhook tests cover body/state/assignee/milestone/delete/mass-update fan-out with the injected per-router config. |
| done | Board route registration runtime config threading | `crates/server/src/routes/boards.rs` | Converted. Board REST and direct route registration now receives `PilotServiceImpl` and reads session/backend/base-path/integration/data-root snapshots from that app-scoped service instead of `routes::mod` passing separate runtime config fragments. | Route assembly no longer passes `runtime.integrations` or `runtime.data_root` into board routes. |
| next | Board handler helper config parameter threading | `crates/server/src/routes/boards.rs` | Board helper functions still pass separate `IntegrationConfig` and `data_root` values internally after route registration derives them from `PilotServiceImpl`. | Convert focused handlers to accept/use `PilotServiceImpl` directly; choose comment create/update webhook delivery or README/online-commit data-root helpers first. |
| next | Code route data-root parameter threading | `crates/server/src/routes/code.rs` | Several code browser/raw/archive handlers clone `service.data_root` and pass `PathBuf` separately through route closures and helper signatures. | Convert one code route group at a time to use `PilotServiceImpl.data_root` where the handler already receives the service. |
| next | Users translation proxy parameter threading | `crates/server/src/routes/users.rs` | Direct translation route registration still takes `TranslationProxyConfig` separately from `RuntimeRegistry`. | Move translation proxy lookup to the route/service snapshot boundary so test-specific translation config remains per-router without another free parameter. |
| done | File upload size/data-root route parameters | `crates/server/src/routes/files.rs` | Converted. File routes and upload/read/delete helpers now receive `PilotServiceImpl` and read `data_root` plus `max_uploaded_file_size` from the app-scoped service snapshot instead of separate runtime config parameters. | `assets_contract` upload/read/delete and injected max-size tests cover the route behavior with per-router `AppRuntimeConfig`. |
| next | Asset fallback Smart HTTP/SVN runtime fragments | `crates/server/src/assets.rs`, `crates/server/src/smart_http.rs`, `crates/server/src/svn_protocol.rs` | Asset fallback still carries `AuthUiConfig`, `IntegrationConfig`, and `data_root` fragments into Smart HTTP/SVN dispatch. | Defer until route-level handler slices are smaller; this is correct behavior today but still parameter-threaded config. |

## Startup Env Parser Boundary

`crates/server/tests/runtime_config_contract.rs` intentionally verifies
`load_startup_config` parsing from explicit maps and files. Production startup
still calls `load_startup_config_from_env()` once in `main`, but parsed values
are consumed as config snapshots instead of being written back to process env.

Current source env accesses are concentrated in:

- `crates/server/src/main.rs`: calls `load_startup_config_from_env()`.
- `crates/server/src/runtime_config.rs`: owns startup env parsing.
- `crates/integrations/src/lib.rs`: still exposes env-backed compatibility
  wrappers around `IntegrationConfig::from_env()`, but server runtime call sites
  use injected `IntegrationConfig` values.
- `crates/server/tests/db_matrix_env.rs` and `crates/vcs/src/lib.rs`: read the
  external test matrix URLs and executable `PATH`; these are not app runtime
  config injection targets.

## Already Converted Notes

- Repository runtime config is explicit through `RepositoryConfig`.
- File upload/download/delete storage receives app-scoped `data_root`.
- Project create/delete/change-vcs/fork storage receives app-scoped `data_root`.
- Smart HTTP, SVN dispatch, board VCS helpers, code browser, pull-request VCS
  helpers, legacy `/_init`, legacy `/_import`, and site-admin portable
  import/export attachment storage use app-scoped data-root snapshots.
- `crates/server/tests/org_project_contract.rs` now injects per-test
  `AppRuntimeConfig.data_root` and no longer mutates `YONA_DATA`.

## Maintenance Rule

When a queue item is completed:

1. Update the row to say `done` or remove it if no follow-up remains.
2. Add a short note to `docs/provenance/core-parity-audit.md` if parity evidence
   changed.
3. Run focused tests for the converted contract file and the standard cargo
   check/parity gates.
