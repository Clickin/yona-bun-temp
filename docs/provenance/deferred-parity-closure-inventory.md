# Deferred Parity Closure Inventory

> Status: historical/interim closure ledger for the deferred parity goal
> directive. This is not a final parity or release-approval ledger.
> Source of truth remains `AGENTS.md`, `SPEC.md`, `docs/plans/2026-06-21-deferred-parity-goal-directive.md`, `docs/plans/2026-06-23-remaining-deferred-parity-execution.md`, and the narrower provenance documents referenced below.

Last updated: 2026-06-23

## Conclusion

The checked canonical/provenance documents no longer showed an active
first-priority app-runtime blocker at this snapshot. The remaining surfaces
below were recorded as implemented, retired by re-audit, or non-blocking/not-
applicable/out-of-scope for that intermediate scope.

Do not start product-improvement work by treating these as silently implemented.
The row-by-row closeout is historical evidence, not a final product-parity
claim. Every user-visible legacy surface remains final scope; a deferred row is
not closed until its behavior is implemented and re-verified under `AGENTS.md`
and `SPEC.md`.

## Remaining Items

| Scope | Current classification | Closure rule before improvement work |
| --- | --- | --- |
| Site-admin `yobi-data` import/export production hardening | Closed as a bounded operator-repair boundary, not an app-runtime UI blocker. `/sites/import` now has dry-run/preflight reports, checksum/size validation, DB transaction rollback, staged attachment promotion, startup reconciliation, checkpoint summaries, duplicate-key rejection, durable staging journals, and focused crash-window coverage. Residuals are fields not exposed by legacy/current schemas plus mismatch recovery that cannot prove which file is authoritative. | Do not invent timestamp fields that legacy export/current schema do not expose. Keep the residual filesystem mismatch as operator inspection/retry scope documented in `docs/provenance/phase-0b/yona-export.md`; there is no known silent data-loss path in the covered committed-staging cases. |
| Unmodified legacy MariaDB/MySQL dump adoption | Local evidence path now exists outside git: `.agent/legacy-dumps/yona-dump.sql`, moved from the repo root on 2026-06-23. `pnpm smoke:legacy-mariadb-dump` passed on 2026-06-23 against `mariadb:10.3`: the script imported the dump, started Rust with `validate_only` without writing `seaql_migrations`, then started with `adopt` and recorded `m20260409_000001_create_legacy_start_schema`. Adopt now creates the current-only `webhook_delivery` table and nullable OAuth profile/token columns missing from the legacy dump. | Keep this ignored dump as the local in-place migration smoke baseline. Do not commit the dump; refresh this row when a newer real legacy dump replaces it. |
| Broader OAuth/provider and LDAP directory edges | Closed by 2026-06-23 re-audit. Configured GitHub/Google OAuth, local linking/session/logout, fixture-backed LDAP, real LDAP bind/search, existing-user refresh, and BasicAuth LDAP are implemented. Rechecked legacy evidence still only proves GitHub/Google social login, local PlayAuthenticate/session logout, and LDAP login/BasicAuth behavior, not unsupported providers or provider-specific external logout. | No active blocker before improvement work. Add behavior only when a concrete legacy controller/config/test artifact proves the edge; otherwise keep current bounded runtime slices as the parity surface. |
| App-wide i18n message-key opt-in | Closed by bounded 2026-06-23 sweep. Dynamic runtime language switching, known legacy-key shells, and the remaining detected raw-key controls now route through existing legacy message lookup where a provider is available. The only scanner leftovers are non-rendered prop keys or deliberate no-provider fallback boundaries. | Do not add a new language selector/settings UI without legacy evidence. Future i18n work needs a newly found visible legacy key/copy gap, not another broad speculative sweep. Keep the legacy `yona-original/conf/messages*` key names exactly; do not replace them with React-only aliases or newly invented semantic keys. |
| Broad legacy `/-_-api/v1/**` compatibility | Closed by 2026-06-23 re-audit. Current migrator/tool boundary is complete for known value. App server owns only direct helper rows; broad runtime compatibility is rejected. | No active blocker before improvement work. Future depth needs a concrete migration/operator replay flow and must stay in `crates/migration/src/legacy_external/**`, not broad app-runtime routes. |
| Legacy outbound GitHub migration under `/migration` | Closed by 2026-06-23 re-audit as optional external destination-adapter scope. Evidence points to disabled-by-default Yona-to-GitHub export/migration, not GitHub-to-Yona or GitHub-to-Rust import; `/_import` Git URL clone is already separate and implemented. | No active blocker before improvement work. Keep GitHub-to-Rust import not-applicable unless legacy evidence appears. Implement outbound GitHub API fixtures only if that migration-tool destination is revived. |
| Full GFM/Highlight.js Markdown breadth | Closed by 2026-06-23 re-audit as non-blocking sample-driven scope. Evidence-backed app-runtime Markdown coverage is closed, and this pass found no newly proven failing legacy Markdown/Highlight.js sample. | No active blocker before improvement work. Add only focused legacy samples that fail current rendering. Do not replace the renderer or chase unsupported Markdown breadth as product improvement. |
| Analytics/custom navbar config | Closed by 2026-06-23 implementation. `application.send.yona.usage` now maps to Rust runtime config with legacy default `true` and injects the legacy GA snippet at the HTML layout boundary. `application.navbar.custom.link.name/url` now maps to browser runtime config and the authenticated root usermenu link surface. Legacy evidence is `Application.SEND_YONA_USAGE`, `layout.scala.html`, `layout_framed.scala.html`, and `common/usermenu.scala.html`. | Guarded by `runtime_config_contract`, `assets_contract`, `runtime-config.spec.ts`, and `root-custom-navbar-link.spec.ts`. |
| Kubernetes manifests | Closed by 2026-06-23 re-audit as non-baseline deployment scope. Release baseline remains SFX plus Docker/base-path; reference-only operator guidance exists. | No active blocker before improvement work. Do not block parity on k8s unless maintained manifests become part of the release baseline. |
| External search engines | Closed by 2026-06-23 re-audit as out of scope. App search now uses DB-native FTS/query where supported with literal-scan fallback, and legacy has no external search API route. | No active blocker before improvement work. Keep Elastic/OpenSearch out of parity and future tuning unless a new product scope replaces the DB-native decision. |
| SVN commit detail comments | Closed by 2026-06-23 implementation. Legacy `CodeHistoryApp` handles SVN commit detail with `svnDiff.scala.html`, `CommitComment`, attachment move, delete redirect, and `NotificationEvent.afterNewSVNCommitComment`; Rust now serves Subversion revision detail from the `.svn` repository path and keeps commit discussion create/delete/redirect behavior on the same user-facing commit route. | Guarded by `code_browser_contract::rest_commit_detail_creates_comments_from_svn_revision` plus the existing Git commit discussion regression. No active blocker before improvement work. |

## Already Retired Or Closed

| Scope | Closeout basis |
| --- | --- |
| Broader SVN/WebDAV PROPFIND edge list | Closed by P3-A contract evidence in `svn_protocol_contract`; stale follow-up wording should not be treated as active. |
| Optional webhook HMAC/signature compatibility | Not applicable. Legacy evidence shows only the optional `Authorization: token <secret> ` header. |
| Slack integration | Closed as `DETAIL_SLACK` webhook detail compatibility, not a separate integration surface. |
| IMAP mailbox service | Stale deferred label retired; current executable-backed mailbox fetch feeds the same raw RFC822 processing boundary. |
| Update notification | Implemented/reclassified with site update status, metadata, hide, and download routes. |
| H2 runtime dialect | Not a Rust runtime DB dialect; covered by the standalone H2-to-SQLite bridge into SQLite adopt validation. |

The `non-blocking`, `not-applicable`, and `out-of-scope` labels above describe
the snapshot's implementation ordering or evidence boundary only. They do not
authorize an ordinary observable divergence, leave user-visible deferred work
in final closure, or authorize a release from this repository.
