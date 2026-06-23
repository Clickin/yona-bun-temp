Status: Current goal directive plan
Date: 2026-06-23

# Remaining Deferred Parity Execution Directive

This is the execution queue for the remaining rows in
`docs/provenance/deferred-parity-closure-inventory.md`. It exists because the
deferred parity goal is not "MariaDB dump adopt only"; improvement work starts
only after every row below is implemented, re-audited as not applicable, or
explicitly retained as non-blocking with legacy evidence.

## Inputs

- `AGENTS.md` conversion principles.
- `SPEC.md` Section 3.3, Appendix A, and current implementation table.
- `docs/plans/2026-06-21-deferred-parity-goal-directive.md`.
- `docs/provenance/deferred-parity-closure-inventory.md`.
- `docs/provenance/first-priority-completion-review.md`.
- `docs/provenance/phase-0b/yona-export.md`.
- Legacy sources checked for the newly identified analytics/custom-navbar slice:
  `yona-original/conf/application.conf.default`,
  `yona-original/app/controllers/Application.java`,
  `yona-original/app/views/common/navbar.scala.html`,
  `yona-original/app/views/layout.scala.html`, and
  `yona-original/app/views/layout_framed.scala.html`.

## Execution Queue

| ID | Scope | Required action | Exit evidence |
| --- | --- | --- | --- |
| R0 | Legacy MariaDB in-place adopt | Closed by implementation/evidence. Keep `.agent/legacy-dumps/yona-dump.sql` ignored and use it as the local smoke baseline. | `pnpm smoke:legacy-mariadb-dump` passed on 2026-06-23; focused migration adopt test covers missing current-only `webhook_delivery` and OAuth nullable columns. |
| R1 | Site-admin `yobi-data` import/export production hardening | Closed by bounded operator-repair evidence. Do not invent legacy fields for issue-comment `updatedAt`, milestone created/updated timestamps, or non-portable attachment timestamp mutation. | `docs/provenance/phase-0b/yona-export.md` records the residual filesystem mismatch as an operator-repair boundary; focused tests cover committed staged-file repair before later live import cleanup, startup reconciliation before `/files/:id`, and mismatch preservation instead of silent deletion. |
| R2 | Analytics usage beacon | Closed by implementation. `Application.SEND_YONA_USAGE` maps to Rust startup/runtime config with legacy default `true`, and HTML serving injects the legacy GA snippet at the layout boundary without product analytics UI. | `runtime_config_contract` covers config loading; `assets_contract` covers server HTML injection/suppression. |
| R3 | Custom navbar link config | Closed by implementation. Legacy evidence is `common/usermenu.scala.html`, not `common/navbar.scala.html`: nonblank `application.navbar.custom.link.name` renders an authenticated right-side usermenu link with the configured URL. | Runtime config projection plus root authenticated usermenu source guard: `runtime-config.spec.ts` and `root-custom-navbar-link.spec.ts`. |
| R4 | App-wide i18n known-key opt-in | Closed by bounded sweep. Remaining raw-key scanner hits are non-rendered prop keys or deliberate no-provider fallback boundaries; no selector/settings UI was added. | Focused frontend specs passed for touched board/issue/project/PR/markdown/milestone/workspace/auth surfaces; scanner command checked raw `title`/`placeholder`/`aria*`/`data-content`/JSX text legacy keys across `frontend/src/routes`. |
| R5 | Broader OAuth/provider and LDAP directory edges | Re-audit only. Current GitHub/Google OAuth, LDAP bind/search, fixture login, and BasicAuth LDAP are implemented. | Proven legacy edge becomes a bounded implementation slice, otherwise record no active parity gap. |
| R6 | Broad legacy `/-_-api/v1/**` compatibility | Keep closed unless a concrete migration/operator replay flow needs more parser depth. Do not mount broad app-server routes. | `docs/provenance/legacy-external-api.md` remains the boundary; any new row is tool-side only. |
| R7 | Legacy outbound GitHub migration | Keep optional external destination-adapter scope. Do not turn this into GitHub-to-Rust import. | Existing `docs/provenance/github-migration-decision.md` remains current, or a future adapter gets deterministic GitHub API fixtures. |
| R8 | Markdown/Highlight.js breadth | Keep evidence-driven. Do not rewrite renderer for theoretical GFM/Highlight.js completeness. | Add focused failing legacy samples only when found; otherwise retain as non-blocking sample-driven follow-up. |
| R9 | Kubernetes manifests | Keep non-baseline unless maintained manifests enter release scope. | `docs/deployment/kubernetes-reference.md` and `tests/kubernetes-guidance-contract.test.mjs` stay current. |
| R10 | External search engines | Keep out of scope. Search remains DB-native FTS plus literal fallback. | No Elastic/OpenSearch implementation unless `SPEC.md` changes. |

## Execution Order

1. R5 through R10 reclassification checks, which should stay documentation-only
   unless new legacy evidence is found.

## Completion Gate

- `docs/provenance/deferred-parity-closure-inventory.md` has no row whose
  closure rule still says "before improvement" without an implementation,
  re-audit decision, or explicit non-blocking rationale.
- `docs/plans/2026-06-21-deferred-parity-goal-directive.md` points to this
  execution directive as the active queue.
- Parity gate passes.
- Focused tests for touched code pass.
- The turn commit hook commits the closure work.
