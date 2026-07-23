# Project search result-state StyleX report

## Scope

This batch owns the project `/$ownerName/$projectName/search` populated issue
result and empty-result states. The output boundary is
`search/result.scala.html` → `search/partial_search.scala.html` plus the eight
search result partials. Frozen `_page.less:6375-6519` and
`_page.less:2966-2970`, Bootstrap responsive rules, messages, and the complete
`yobi.less` import chain are the cascade and copy sources.

The route preserves the existing project-search DOM, legacy classes, category
navigation, links, highlighting, pagination, copy, and order. Only stable
`data-stylex-part` markers were added to the nested issue title/content/meta,
keyword, and empty-result owners; no shared fallback or compensating geometry
was changed.

## Evidence

`frontend/tests/stylex-project-search-results.e2e.ts` verifies the legacy
source/import chain, exact computed frozen declarations, populated issue copy
and link, keyword highlighting, category interaction, empty state, desktop and
390px owned-box containment, no owner inline geometry, and screenshots under
`output/playwright/stylex-project-search-results/`.

Managed dynamic-port system-Chrome runs outside the sandbox pass 5/5 in normal
and fallback-off modes. Fallback-off retains the known authenticated
project/search shell baseline allowance; result-owned boxes remain contained
and no CSS compensation was added. Screenshots were visually inspected. Live
legacy rendering was unavailable, so direct legacy screenshot parity remains
unverified.

The Yoram footer identity is intentional: NAVER/NAVER LABS/NAVER CLOUD,
upstream Yona repository, and developer-contact entries are not restored.
