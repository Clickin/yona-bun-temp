# Organization issues populated-row StyleX ownership (2026-07-20)

## Scope

Route: `/organizations/$organizationName/issues`, populated/open state.

Owners: row shell, author avatar, title wrapper/title, post id, and metadata
(`organization-issues-row`, `organization-issues-row-avatar`,
`organization-issues-row-title-wrap`, `organization-issues-row-title`,
`organization-issues-row-post-id`, `organization-issues-row-meta`).

## Legacy evidence

`yona-original/app/views/organization/group_issue_list_partial.scala.html`
provides the organization list output and delegates the shared row shape to
the issue partial. Frozen `_page.less` supplies the post-item block/clear/
padding/overflow/border, avatar float/gutter, title-wrap ellipsis, title/post
id typography, and metadata display/line-height declarations.

## Change and fallback boundary

The route-local StyleX file now owns those declarations. `post-item`,
`avatar-wrap`, `title-wrap`, `title`, `post-id`, and `infos` remain semantic
legacy classes because shared frozen fallback still serves other issue-list
routes. No frozen source or `frontend/src/app.css` rule was modified. Route
semantic colors are kept in `organizationIssuesTheme`; non-theme geometry and
typography are direct StyleX declarations.

## Verification

- `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend check` passed.
- `stylex-organization-issues-label-color.e2e.ts` contains populated-row
  owner and computed-style assertions; this worker could not complete the
  managed browser replay because the shared frontend server was not running.
- No fallback-off claim is made for shared CSS retirement; this is an owner
  wave with fallback intentionally retained.
