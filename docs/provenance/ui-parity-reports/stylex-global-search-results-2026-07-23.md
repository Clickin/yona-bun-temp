# Global search result state StyleX report

## Scope

This batch ports the global `/search` populated project-result and empty-result
states. The legacy output source is `search/partial_search.scala.html` with
the issue, user, project, post, milestone, issue-comment, post-comment, and
review partials. The frozen cascade is the complete `yobi.less` import chain,
especially `_page.less:6375-6495` and `_page.less:2966-2970`, Bootstrap list/
float utilities, and the search messages.

The route keeps the legacy result list/item/title/avatar/content/meta DOM,
keyword highlighting, links, category navigation, result order, and empty
background. The only new ownership marker is on nested avatar images. Empty
REST project-logo URLs now use the existing Vite-imported
`frontend/src/assets/legacy/project_default_logo.png`; non-empty API URLs are
unchanged. This fixes the previously observed broken fallback image without
adding geometry.

## Evidence

`frontend/tests/stylex-global-search-results.e2e.ts` proves the source/import
chain, route-local StyleX owners, computed frozen declarations, loaded fallback
avatar, copy/order/highlighting, category navigation, empty state, desktop and
390px containment, and no document overflow. Managed system-Chrome dynamic-port
runs outside the sandbox pass 5/5 in normal and fallback-off modes. Screenshots
are saved under `output/playwright/stylex-global-search-results/` for both modes,
populated and empty states, desktop and mobile.

The screenshots were visually inspected. The Yoram footer remains the approved
identity variant; NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and
developer-contact entries are intentionally absent. A live legacy render was
unavailable, so direct screenshot parity against legacy remains unverified.
No `app.css`, frozen source, or generated fallback selector was deleted.
