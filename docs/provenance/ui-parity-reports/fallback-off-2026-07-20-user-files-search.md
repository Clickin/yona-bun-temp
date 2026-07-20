# `/user/files` search fallback-off report

## Scope

This bounded wave retires only the route-local `.user-file-search` fallback
block from `frontend/src/app.css`. The current React route keeps the legacy
search DOM order and copy while `searchRoot`, `searchInput`, and `searchAction`
StyleX owners provide the geometry, responsive values, typography, and paint.
The legacy `user-file-search`, `search`, `search-bar`, `textbox`, and
`search-btn` classes are no longer emitted by the React runtime. The frozen
Scala fixture and LESS remain unchanged as parity evidence; shared `.search`,
`.search-bar`, `.textbox`, `.search-btn`, and `.attachment-files` rules are
outside this retirement.

The existing route-local action owner keeps a `12px` minimum width, matching
the legacy icon action's computed hit area. This prevents the button from
collapsing to zero width when fallback-off intentionally omits the optional
legacy icon-font stylesheet.

Legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.

## Evidence

- Legacy root: `yona-original/app/views/user/userFiles.scala.html`
- Frozen style evidence: `yona-original/app/assets/stylesheets/less/_page.less` `.user-file-search` rule and the imported search-bar rules
- React owners: `frontend/src/routes/user/files.tsx` and `frontend/src/routes/user/-files.stylex.ts`
- Stable-owner tests: `frontend/tests/stylex-user-files-search.e2e.ts`, `stylex-user-files-screen.e2e.ts`, and `user-files.e2e.ts`

## Fallback contract

The exact `.user-file-search` and `.user-file-search .textbox` blocks are absent
from `frontend/src/app.css`; frozen legacy source remains present. Normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` runs must render the same owner geometry at
1366px and 390px, preserve the search icon/copy, and navigate through the
existing TanStack Router/Query filter path.

Global fallback-off discovery remains incomplete/non-green; this report does
not claim that the generated fallback stylesheet can be unlinked globally.

Focused search contract: normal desktop/mobile `2/2`; fallback-off
desktop/mobile `2/2`. The broader pre-existing `user-files.e2e.ts` DOM checks
still require exact legacy class-only assertions on unrelated StyleX row/icon
owners and are not used as evidence for this search retirement.
