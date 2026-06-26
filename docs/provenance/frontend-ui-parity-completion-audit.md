# Frontend UI Parity Completion Audit

Status: current evidence audit
Date: 2026-06-26

## Scope

This audit checks the active goal boundary:

- Legacy Yona user-visible UI behavior is rendered by the React SPA.
- Legacy Java template/fragment endpoints are converted to REST JSON/API-return
  plus React render instead of becoming a second runtime HTML-fragment data
  source.
- Markdown rendering is owned by the React Markdown compatibility boundary, with
  legacy-specific plugins and sanitizer behavior centralized in one renderer.

This document does not claim product-improvement work. Outbound GitHub migration
behavior, broad external `/-_-api/v1/**` migrator compatibility, and other
operator/tool surfaces remain governed by their provenance decisions and are not
frontend UI parity blockers.

## Gate Result

Authoritative report set:

- `docs/provenance/ui-parity-reports/*.md`
- `docs/plans/2026-06-26-full-ui-parity-subagent-phase.md`
- `docs/provenance/ui-parity-reports/README.md`

Current report-summary totals:

| status | count |
| --- | ---: |
| covered | 209 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 9 |
| weak evidence | 0 |
| needs-parent-decision | 0 |
| total | 218 |

Actionable UI parity coverage is 100.0% because every actionable row is
`covered` and every blocker bucket is zero.

Raw coverage is 95.9% because the remaining 9 rows are `not-applicable`
transport/template mechanics, not missing user-visible UI functions.

## Remaining Not-Applicable Rows

| report | row | reason it is not a UI parity blocker |
| --- | --- | --- |
| `ui-parity-auth-public-entry.md` | invalid `/verify/:loginId/:verificationCode` deep-link HTTP status | React deep links use SPA fallback status; the visible invalid-verification body is covered and REST verify owns the not-found status. |
| `ui-parity-board-milestone.md` | `/organizations/:name/boards` notice pinning | Provenance records no separate organization aggregation notice-pinning behavior to preserve. |
| `ui-parity-code-vcs.md` | legacy `code/!` ajax JSON route | Legacy `code.Browser` metadata transport is compatibility-only; app runtime renders code views from REST data in React. |
| `ui-parity-fragment-security-db.md` | project issue-list XHR/PJAX rows | Legacy PJAX HTML fragments are converted to REST JSON plus React issue-list render. |
| `ui-parity-issues.md` | legacy PJAX/timeline HTML fragments | Legacy timeline/list fragments are converted to React-rendered REST data. |
| `ui-parity-pull-request-review.md` | PR delete action | Legacy exposes source-branch delete/restore, not a pull-request delete route. |
| `ui-parity-pull-request-review.md` | direct legacy form/fragment routes | Direct form/fragment endpoints are compatibility evidence; React SPA uses REST JSON plus React render. |
| `ui-parity-search-notification.md` | server-rendered notification fragment as React data source | Legacy append-HTML notification fragments are replaced by REST data and React row rendering. |
| `ui-parity-site-admin-setup.md` | `/sites/:unknown` | Legacy has no catch-all site-admin route beyond concrete `conf/routes` entries. |

## Markdown Boundary

The React Markdown compatibility boundary is:

- `frontend/src/routes/-markdown-renderer.tsx`

Key current guarantees:

- It is the only frontend file allowed to import/use `react-markdown` or
  Markdown parser/sanitizer packages directly.
- It wires the legacy compatibility plugins and transforms through:
  `remarkYonaAutolinks`, `legacyMarkedPreprocess`, `rehypeRaw`,
  `rehypeSanitize`, `yonaMarkdownSanitizeSchema`,
  `reactMarkdownUrlTransform`, `reactMarkdownComponents`, and the legacy
  task-list helpers.
- Route components render legacy Markdown content through `MarkdownRenderer`
  instead of consuming server-rendered Markdown HTML fragments.
- Long/invalid fenced Markdown, including long SQL code blocks, renders as
  source inside the React Markdown surface rather than invoking server-side
  rendering or unbounded syntax-token expansion.

Primary tests:

- `frontend/src/markdown-render-boundary.spec.tsx`
- `frontend/src/markdown-renderer.spec.tsx`
- `frontend/tests/legacy-rendered-page-audit.e2e.ts`
- `crates/server/tests/markdown_contract.rs`

## Verification Commands

The following commands are the focused completion evidence for this audit:

- `node --test tests/ui-parity-gate-a-contract.test.mjs tests/rc-ux-checklist-contract.test.mjs`
- `pnpm --dir frontend test -- markdown-renderer.spec.tsx markdown-render-boundary.spec.tsx`
- `pnpm agent:cargo-test -- --outside-sandbox -p yoram-server legacy_markdown`

## Conclusion

Frontend UI parity is closed for the current app-runtime scope:

- There are no remaining `gap`, `deviation`, `deferred`, `weak evidence`, or
  `needs-parent-decision` rows in the UI parity report set.
- The remaining 9 non-covered rows are explicitly not app-runtime UI functions.
- Markdown rendering is centralized in the React compatibility renderer and is
  covered by boundary, renderer, browser, and server-preview tests.

Future work can reopen a row only with new legacy evidence or a browser-visible
parity defect. Product improvements must start after this parity baseline rather
than by changing legacy UI behavior.
