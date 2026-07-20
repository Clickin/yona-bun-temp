# StyleX error-wrap post and search states — 2026-07-21

Batch 664 moves the exact frozen error-state declarations into three route
owners:

- project post not-found;
- project-search forbidden, including anonymous login navigation;
- organization-search error.

Legacy output evidence comes from the board view/list/partial-list templates,
search result and partial-search templates, the forbidden/not-found and
organization-forbidden templates, project/organization shell partials,
`conf/messages`, `_page.less:5230-5236`, and `_sprites.less:488-497`. The
React output retains the legacy `.error-wrap`, `.ico.ico-err2`, element order,
copy, and list/login links. Each colocated StyleX owner carries only the frozen
wrapper, sprite, and message declarations: `padding: 100px 0`, centered text,
the `-80px -160px` sprite position with `50px × 80px` geometry, and the bold
16px gray message with 30px vertical margins.

The shared legacy fallback remains intentionally enabled for other current
React error-wrap emitters; this wave does not claim fallback retirement.

Focused evidence:

- `stylex-project-post-detail-error-wrap.e2e.ts`
- `stylex-project-search-error-wrap.e2e.ts`
- `stylex-organization-search-error-wrap.e2e.ts`

The serial managed Playwright suite passed 3/3 with fallback enabled and 3/3
with `VITE_DISABLE_LEGACY_FALLBACK=1`. Tests cover visible copy, login/list
navigation, computed declarations, and desktop/mobile containment.

Live legacy visual comparison is a documented gap: the usual legacy endpoints
were unavailable during this verification turn. The focused tests provide the
executable legacy-source and browser-metric evidence; a live visual sweep is
deferred until the legacy service is available.

