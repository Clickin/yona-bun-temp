# Fallback-off report: project issues row and mass-update ancestor bridge

Date: 2026-07-20  
Batch: 588

## Scope

Retired the contiguous unreachable `.issue-list-page` block from
`frontend/src/app.css`, covering the historical mass-update, issue-row
avatar/title/metadata, count-group, and child-issue declarations. The
standalone `.milesion-wrap .item-count-groups > button.sharer-color` arm was
intentionally retained.

## Evidence

- `frontend/tests/stylex-project-issues-list-row-owners.e2e.ts`
- `frontend/tests/legacy-fallback-off.e2e.ts`
- `yona-original/app/views/issue/partial_list_wrap.scala.html`
- `yona-original/app/views/issue/partial_list.scala.html`
- `yona-original/app/assets/stylesheets/less/_page.less`

The legacy templates establish the historical wrapper, while current React
issue routes emit `page-wrap-outer`/`project-page-wrap`/`issue-list-wrap` and
do not emit an `issue-list-page` ancestor. Route-local StyleX and generic
compatibility rules therefore own the active row and mass-update presentation;
the scoped block could not match current DOM.

## Result

Normal and fallback-off static contracts assert exact selector absence and
retained raw row/class ownership. Frozen legacy sources and generated fallback
assets remain unchanged; global fallback discovery remains active.
