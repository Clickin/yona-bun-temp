# Runtime Config DI Inventory

Status: current

Last updated: 2026-06-20

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
| done | Auth/workspace runtime config | `crates/server/tests/auth_workspace_contract.rs` | Converted. Auth UI, SMTP sender, and site-name route behavior tests use explicit `AppRuntimeConfig`; process env mutation and `auth_env_lock` were removed. | Shared mail delivery assertions use `auth_outbox_lock` only for the test outbox. |
| 6 | Site admin SMTP/runtime config | `crates/server/tests/site_admin_contract.rs` | `smtp_env_lock` protects SMTP env parser/default tests and request-time SMTP mutation checks; also has non-mutating max-file-size env assertions. | Convert route/mail behavior tests to `AppRuntimeConfig.smtp`; leave direct `SmtpRuntimeConfig::from_env` parser tests only if they are intentionally scoped as parser tests. |
| 7 | Notification mail runtime config | `crates/server/tests/notification_contract.rs` | `notification_mail_env_lock` remains around notification scheduler/env and SMTP_FROM request-time mutation assertions. | Prefer `NotificationMailDeliveryConfig` and startup snapshot map helpers; remove request-time env mutation checks once equivalent explicit config coverage exists. |
| 8 | Project transfer mail config | `crates/server/tests/project_transfer_contract.rs` | SMTP_FROM request-time mutation/restore helper remains. | Inject `AppRuntimeConfig.smtp`/site mail config into the router and assert env is not consulted during request handling. |
| 9 | Integrations env-backed convenience functions | `crates/integrations/src/lib.rs` | Public helpers such as `deliver`, `deliver_webhook`, `smtp_enabled`, and `*_from_env` call `IntegrationConfig::from_env()`. | Audit call sites. Prefer `*_with_config` APIs from app/runtime paths; keep env-backed helpers only as startup/legacy compatibility wrappers if still needed. |

## Startup Env Parser Exception

`crates/server/tests/runtime_config_contract.rs` intentionally verifies
`load_startup_config`, `load_startup_config_from_env`, and the temporary startup
compatibility bridge that writes selected values back to process env. Do not use
that file as a normal route/service DI conversion target unless the production
startup bridge itself is being removed.

Current source env accesses are concentrated in:

- `crates/server/src/main.rs`: calls `load_startup_config_from_env()`.
- `crates/server/src/runtime_config.rs`: owns startup env parsing and the
  temporary compatibility env bridge.
- `crates/integrations/src/lib.rs`: still exposes env-backed convenience
  wrappers around `IntegrationConfig::from_env()`.

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
