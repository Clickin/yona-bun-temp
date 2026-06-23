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
| R1 | Site-admin `yobi-data` import/export production hardening | Finish or explicitly retire the remaining crash/operator limits. Do not invent legacy fields for issue-comment `updatedAt`, milestone created/updated timestamps, or non-portable attachment timestamp mutation. | Either tests narrow the remaining filesystem process-kill/mismatch window, or `docs/provenance/phase-0b/yona-export.md` records it as an operator-repair boundary with no silent data loss. |
| R2 | Analytics usage beacon | Re-audit `Application.SEND_YONA_USAGE` and layout GA script behavior. If implemented, preserve the legacy default true/false config and exact GA script insertion boundary without adding product analytics UI. | Runtime config test plus frontend/server shell assertion, or provenance entry proving the legacy script is intentionally not part of Rust parity. |
| R3 | Custom navbar link config | Re-audit `application.navbar.custom.link.name/url`. Legacy config and controller constants exist, but the checked `common/navbar.scala.html` did not render the link directly. | Either implement the proven render surface with tests, or record a not-applicable decision citing the missing view usage. |
| R4 | App-wide i18n known-key opt-in | Sweep remaining existing controls that still render known legacy keys/copy as literal fallback text. Do not add a selector/settings UI. | Focused frontend tests for any newly converted controls, or a provenance note that no remaining known-key controls were found. |
| R5 | Broader OAuth/provider and LDAP directory edges | Re-audit only. Current GitHub/Google OAuth, LDAP bind/search, fixture login, and BasicAuth LDAP are implemented. | Proven legacy edge becomes a bounded implementation slice, otherwise record no active parity gap. |
| R6 | Broad legacy `/-_-api/v1/**` compatibility | Keep closed unless a concrete migration/operator replay flow needs more parser depth. Do not mount broad app-server routes. | `docs/provenance/legacy-external-api.md` remains the boundary; any new row is tool-side only. |
| R7 | Legacy outbound GitHub migration | Keep optional external destination-adapter scope. Do not turn this into GitHub-to-Rust import. | Existing `docs/provenance/github-migration-decision.md` remains current, or a future adapter gets deterministic GitHub API fixtures. |
| R8 | Markdown/Highlight.js breadth | Keep evidence-driven. Do not rewrite renderer for theoretical GFM/Highlight.js completeness. | Add focused failing legacy samples only when found; otherwise retain as non-blocking sample-driven follow-up. |
| R9 | Kubernetes manifests | Keep non-baseline unless maintained manifests enter release scope. | `docs/deployment/kubernetes-reference.md` and `tests/kubernetes-guidance-contract.test.mjs` stay current. |
| R10 | External search engines | Keep out of scope. Search remains DB-native FTS plus literal fallback. | No Elastic/OpenSearch implementation unless `SPEC.md` changes. |

## Execution Order

1. R1 production import/export hardening, because it is the only active data-loss
   risk category left in the closure inventory.
2. R2 and R3 analytics/custom-navbar re-audit, because these have direct legacy
   config evidence and should not remain ambiguous.
3. R4 i18n known-key sweep, because it is broad but bounded to existing UI.
4. R5 through R10 reclassification checks, which should stay documentation-only
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
