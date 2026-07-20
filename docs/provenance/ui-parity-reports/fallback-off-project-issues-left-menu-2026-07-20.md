# Fallback-off report: project issues left-menu scoped bridge

Date: 2026-07-20  
Batch: 587

## Scope

Retired the unreachable `.issue-list-page .left-menu` search/filter selector
block from `frontend/src/app.css`:

- `#search hr.hide-in-mobile`
- `.search-bar`
- `.search-bar .textbox`
- `.search-bar .search-btn`
- `.issue-option`
- `.issue-option dt`
- `.issue-option dd`
- `.issue-option select`

All eight selectors were scoped by an `issue-list-page` ancestor that no
current React route emits. Project issues, user issues, and organization issues
use `issue-list-wrap` plus route-local StyleX owners instead. Generic search
rules and the frozen/generated legacy fallback remain unchanged.

## Evidence

- `frontend/tests/stylex-project-issues-static-owners-wave.e2e.ts`
- `frontend/tests/legacy-fallback-off.e2e.ts`
- `yona-original/app/views/issue/partial_list_wrap.scala.html`
- `yona-original/app/views/issue/partial_searchform.scala.html`
- `yona-original/app/assets/stylesheets/less/_page.less` (`.issue-option` and
  generic search-bar rules)

The focused static contracts assert exact app.css selector absence and retain
neighboring generic search contracts. No TSX, frozen source, generated
fallback asset, theme, or geometry baseline changed.

## Result

Normal and fallback-off focused contracts pass. This report is evidence for a
dead app.css bridge retirement only; global fallback discovery remains active.
