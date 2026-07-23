# Search-result consumer graph and fallback boundary

## Decision

This is a bounded C/R evidence decision, not a fallback-retirement implementation.
The global, project, and organization search result routes already have direct
StyleX owners for their route-specific result structure. The shared
`frontend/src/app.css` search bridge remains enabled because its effective
geometry is not yet proven against a live legacy rendering for populated and
empty result states. No route, frozen source, or fallback selector was changed
in this batch.

## Source and consumer graph

The frozen output source is `yona-original/app/views/search/partial_search.scala.html`.
The frozen declaration source is `_page.less:6375-6495`, loaded through the
complete `yobi.less` import chain. Relevant declarations include the search-box
bottom border/padding, 16px result heading with 15px top margin and horizontal
padding, list reset, content block, and metadata spacing/type.

The three direct React consumers and StyleX owners are:

- global `/search`: `frontend/src/routes/search.tsx` and `-search.stylex.ts`;
- project `/:ownerName/:projectName/search`: `search.tsx` and `-project-search.stylex.ts`;
- organization `/organizations/:organizationName/search`: `search.tsx` and `-organization-search.stylex.ts`.

Their existing category-focused checks pass in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes: 7/7 tests in each mode. The first
fallback-off attempt was concurrent with another managed run and was stopped;
the sequential rerun is the acceptance result.

## Retained bridge

`frontend/src/app.css` still contains shared search declarations whose current
effective values are not all directly traceable to the frozen source: the
`.search-box-wrap` `margin-bottom:16px` bridge, `#searchInnerForm` flex layout,
`#searchKeyword` flex/min-width rules, the 18px result-title bridge, list
border/reset, title/id layout, content wrapping/line-height, and metadata
flex/gap/color/font rules. The existing parity report also records these
route-specific search-box, result-title, list, content/meta, and empty-result
families as pending geometry and consumer proof.

Therefore the bridge and generated fallback remain. The next safe boundary is
one route with paired populated/empty-state computed-geometry and screenshot
evidence, followed by the other two consumers before deleting shared rules.

## Intentional Yoram identity differences

Footer/provider/developer-contact/repository differences are intentional Yoram
changes: unrelated NAVER/NAVER LABS/NAVER CLOUD entries, the upstream Yona
repository URL, and developer-contact entries are not to be restored as parity
gaps.

Live legacy screenshot comparison remains unverified for this search-result
family. No compensating geometry was added.
