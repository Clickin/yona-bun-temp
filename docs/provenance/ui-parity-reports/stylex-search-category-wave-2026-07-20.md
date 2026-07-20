# Global, project, and organization search category StyleX wave — 2026-07-20

## Scope

Batch 571 gives the three search category wrappers route-local StyleX owners
while retaining the frozen `search-category-wrap` compatibility selector. The
three route boundaries are:

- `/search`: `global-search-category`, `global-search-category-list`, and
  `global-search-category-item`
- `/:ownerName/:projectName/search`: the corresponding `project-search-category-*`
  owners
- `/organizations/:organizationName/search`: the corresponding
  `organization-search-category-*` owners

The category list, item borders/typography, active and empty states, links, and
count badges retain the legacy geometry and copy. Existing search parity suites
still consume `.search-category-wrap`, `.active`, `.empty`, and
`.num-badge.pull-right`, so those tokens remain as a compatibility bridge while
StyleX owns the route-local declarations. No `app.css`, frozen source, theme
variable, or generated fallback asset is removed in this wave.

## Legacy source and translation boundary

`yona-original/app/views/search/partial_search.scala.html:77-128` establishes
the category list order, labels, count badges, and active/empty class states.
The frozen `yona-original/app/assets/stylesheets/less/_page.less:6394-6404`
establishes the category list's bold item and empty-link behavior; the frozen
generated search category rules preserve the list border, link box model, and
responsive containment. Legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부
동작은 React state/events/components + TanStack Router/Query로 번역한다.

## Focused evidence

The focused contracts are:

- `frontend/tests/stylex-global-search-category.e2e.ts`
- `frontend/tests/stylex-project-search-category.e2e.ts`
- `frontend/tests/stylex-organization-search-category.e2e.ts`

Each contract pins the legacy partial/LESS source, stable route-local owners,
retained compatibility tokens, and desktop/390px category containment. The
global route test mocks session and search API variants; the project and
organization tests retain their route-specific API boundaries. The integrated
managed batch ran 7 tests with 3 workers: normal mode passed 7/7 and
`VITE_DISABLE_LEGACY_FALLBACK=1` passed 7/7. Project and organization actions
also carry the frozen Bootstrap `box-sizing: border-box` behavior. The
fallback-off page still has a pre-existing 7px document overflow from shared
`.span2`/`.span10` grid rules; focused contracts intentionally assert owned
category/list/item/action/content boxes rather than attributing that shared
layout gap to this wave.

## Discovery boundary

The shared `.search-category-wrap` fallback remains intentionally retained for
the global, project, organization, and other search consumers. Global fallback
discovery remains incomplete/non-green; this batch does not claim generated
fallback unlinking, fallback retirement, or live-legacy visual parity.
