# Deferred Parity Closure Inventory

> Status: current closure ledger for the deferred parity goal directive.
> Source of truth remains `AGENTS.md`, `SPEC.md`, `docs/plans/2026-06-21-deferred-parity-goal-directive.md`, `docs/plans/2026-06-23-remaining-deferred-parity-execution.md`, and the narrower provenance documents referenced below.

Last updated: 2026-06-23

## Conclusion

The checked canonical/provenance documents no longer show an active first-priority app-runtime parity blocker. The remaining items are now evidence-driven follow-up or explicitly not-applicable/out-of-scope surfaces.

Do not start product-improvement work by treating these as silently implemented. The deferred goal directive is complete only when each row below is implemented, retired by re-audit, or deliberately accepted as a non-blocking follow-up through `docs/plans/2026-06-23-remaining-deferred-parity-execution.md`.

## Remaining Items

| Scope | Current classification | Closure rule before improvement work |
| --- | --- | --- |
| Site-admin `yobi-data` import/export production hardening | Closed as a bounded operator-repair boundary, not an app-runtime UI blocker. `/sites/import` now has dry-run/preflight reports, checksum/size validation, DB transaction rollback, staged attachment promotion, startup reconciliation, checkpoint summaries, duplicate-key rejection, durable staging journals, and focused crash-window coverage. Residuals are fields not exposed by legacy/current schemas plus mismatch recovery that cannot prove which file is authoritative. | Do not invent timestamp fields that legacy export/current schema do not expose. Keep the residual filesystem mismatch as operator inspection/retry scope documented in `docs/provenance/phase-0b/yona-export.md`; there is no known silent data-loss path in the covered committed-staging cases. |
| Unmodified legacy MariaDB/MySQL dump adoption | Local evidence path now exists outside git: `.agent/legacy-dumps/yona-dump.sql`, moved from the repo root on 2026-06-23. `pnpm smoke:legacy-mariadb-dump` passed on 2026-06-23 against `mariadb:10.3`: the script imported the dump, started Rust with `validate_only` without writing `seaql_migrations`, then started with `adopt` and recorded `m20260409_000001_create_legacy_start_schema`. Adopt now creates the current-only `webhook_delivery` table and nullable OAuth profile/token columns missing from the legacy dump. | Keep this ignored dump as the local in-place migration smoke baseline. Do not commit the dump; refresh this row when a newer real legacy dump replaces it. |
| Broader OAuth/provider and LDAP directory edges | Evidence-driven follow-up. Configured GitHub/Google OAuth, local linking/session/logout, fixture-backed LDAP, real LDAP bind/search, and BasicAuth LDAP are implemented. | Add behavior only when a concrete legacy controller/config/test artifact proves the edge. Otherwise keep current bounded runtime slices as the parity surface. |
| App-wide i18n message-key opt-in | Evidence-driven follow-up. Dynamic runtime language switching and many known legacy-key shells are implemented; remaining scope is other existing controls that still render known legacy keys/copy as fallback text. | Continue only as legacy-key sweeps over existing screens. Do not add a new language selector/settings UI without legacy evidence. |
| Broad legacy `/-_-api/v1/**` compatibility | Current migrator/tool boundary closed for known value. App server owns only direct helper rows; broad runtime compatibility is rejected. | Future depth needs a concrete migration/operator replay flow and must stay in `crates/migration/src/legacy_external/**`, not broad app-runtime routes. |
| Legacy outbound GitHub migration under `/migration` | Optional external destination-adapter follow-up. Evidence points to Yona-to-GitHub export/migration, not GitHub-to-Yona import; `/_import` Git URL clone is already separate and implemented. | Keep GitHub-to-Rust import not-applicable unless legacy evidence appears. Implement outbound GitHub API fixtures only if that migration-tool destination is revived. |
| Full GFM/Highlight.js Markdown breadth | Evidence-backed app-runtime Markdown coverage is closed; full parser/highlighter breadth remains sample-driven follow-up. | Add only focused legacy samples that fail current rendering. Do not replace the renderer or chase unsupported Markdown breadth as product improvement. |
| Analytics/custom navbar config | Closed by 2026-06-23 implementation. `application.send.yona.usage` now maps to Rust runtime config with legacy default `true` and injects the legacy GA snippet at the HTML layout boundary. `application.navbar.custom.link.name/url` now maps to browser runtime config and the authenticated root usermenu link surface. Legacy evidence is `Application.SEND_YONA_USAGE`, `layout.scala.html`, `layout_framed.scala.html`, and `common/usermenu.scala.html`. | Guarded by `runtime_config_contract`, `assets_contract`, `runtime-config.spec.ts`, and `root-custom-navbar-link.spec.ts`. |
| Kubernetes manifests | Non-baseline deployment follow-up. Release baseline remains SFX plus Docker/base-path; reference-only operator guidance exists. | Do not block parity on k8s unless maintained manifests become part of the release baseline. |
| External search engines | Out of scope. App search now uses DB-native FTS where supported with literal-scan fallback. | Keep Elastic/OpenSearch out of parity and future tuning unless a new product scope replaces the DB-native decision. |

## Already Retired Or Closed

| Scope | Closeout basis |
| --- | --- |
| Broader SVN/WebDAV PROPFIND edge list | Closed by P3-A contract evidence in `svn_protocol_contract`; stale follow-up wording should not be treated as active. |
| Optional webhook HMAC/signature compatibility | Not applicable. Legacy evidence shows only the optional `Authorization: token <secret> ` header. |
| Slack integration | Closed as `DETAIL_SLACK` webhook detail compatibility, not a separate integration surface. |
| IMAP mailbox service | Stale deferred label retired; current executable-backed mailbox fetch feeds the same raw RFC822 processing boundary. |
| Update notification | Implemented/reclassified with site update status, metadata, hide, and download routes. |
| H2 runtime dialect | Not a Rust runtime DB dialect; covered by the standalone H2-to-SQLite bridge into SQLite adopt validation. |
