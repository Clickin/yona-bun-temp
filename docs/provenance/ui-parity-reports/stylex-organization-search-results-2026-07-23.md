# Organization search result state StyleX report

## Scope

This batch owns the organization `/organizations/$organizationName/search`
populated issue-result and empty-result states. Legacy output is
`search/result.scala.html` → `search/partial_search.scala.html` and the eight
search partials, with `_page.less:6375-6519` and `_page.less:2966-2970`,
Bootstrap, messages, and the complete `yobi.less` import chain as the frozen
cascade/copy source.

The route preserves the legacy list/item/title/content/meta DOM, classes,
keyword highlighting, category navigation, links, copy, order, and empty
image. Only nested title/content/meta/keyword owner markers were added; no
geometry or shared fallback selector was changed.

## Evidence

`frontend/tests/stylex-organization-search-results.e2e.ts` proves the source
and import chain, exact computed frozen declarations, populated issue copy and
links, keyword highlighting, category interaction, empty state, desktop/390px
owned-box containment, and screenshots under
`output/playwright/stylex-organization-search-results/`.

Managed dynamic-port system-Chrome runs outside the sandbox pass 5/5 in normal
and fallback-off modes. The fallback-off mobile document width retains the
known 8px authenticated project/search shell baseline; owned result boxes stay
strictly contained and no CSS compensation was added. Screenshots were visually
inspected. Live legacy rendering was unavailable, so direct legacy screenshot
parity remains unverified.

The Yoram footer remains intentional: NAVER/NAVER LABS/NAVER CLOUD, upstream
Yona repository, and developer-contact entries are not restored.
