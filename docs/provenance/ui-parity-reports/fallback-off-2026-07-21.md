# Fallback-off discovery report — 2026-07-21

Status: discovery only; the React-served legacy fallback remains enabled by default.

## Run

- Command: `VITE_DISABLE_LEGACY_FALLBACK=1 pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node ../scripts/run-playwright-e2e.mjs -- --workers=15`
- Runtime: managed dynamic ports (`YONA_E2E_MANAGED_SERVERS=1`), Rust backend plus Vite frontend
- Scope: the complete Playwright suite, including its desktop and mobile viewport cases
- Result: `2,675` tests, `1,541` passed, `1` skipped, `1,133` failed, `49.4m`
- Default mode: not changed; the normal application still serves the generated legacy fallback
- Frozen sources: no `yona-original/**` file was changed

## Failure classification

The 1,133 Playwright failure artifact directories under `frontend/test-results/` are the
authoritative per-failure evidence. The bounded filename classification below assigns every
artifact to exactly one follow-up lane; it is triage evidence, not proof that a declaration may
be retired.

| Lane | Count | Classification rule and representative evidence |
| --- | ---: | --- |
| React StyleX owner candidate | 449 | `stylex-*` artifacts whose fallback-off computed paint/geometry, screenshot, or owner contract still depends on a frozen declaration; examples include `stylex-global-gnb-*`, `stylex-organization-*`, and `stylex-site-*`. Migrate only the exact cited declaration in its owning route/state. |
| Global/shared bridge candidate | 40 | `global-*`, `global-shell-*`, `site-admin-*`, or `ui-kit-*` artifacts where the declaration has no single route owner or is shared by shell/plugin boundaries. Review for the smallest cited bridge; do not add a catch-all stylesheet. |
| Route DOM/behavior/data parity | 641 | Remaining route artifacts where fallback-off exposed missing/changed DOM, navigation, query state, interaction, or fixture behavior rather than a proven CSS-only consumer. Repair parity first and do not mask it with StyleX. |
| Fallback-boundary/static contract | 3 | `legacy-fallback-off-*` artifacts. These are runtime asset/static retirement checks and remain non-green until their exact contract is independently repaired and reviewed. |

The first failures are representative of the classification: login/auth alias and legacy DOM
comparison failures, global shell/help/migration geometry failures, organization/project shell
failures, and later user-settings/files/issues/profile state failures. They do not justify
unlinking the fallback because the global run is not green.

## Decision

Do not unlink `legacy-fallback.css`, delete shared selector families, or claim fallback retirement.
The next wave must select a bounded 2–6-owner state from the classified artifacts, identify the
exact frozen Scala/LESS/CSS source, add focused normal and fallback-off evidence, and update the
ledger and Scala audit in the same commit when route TSX changes.

## First bounded repair wave

The organization pull-request review-progress artifact was repaired without changing the
fallback boundary. The route-local owner now carries the exact emitted `.upload-progress`
track geometry (`display:inline-block`, `width:30px`, `height:7px`, `vertical-align:middle`,
`overflow:hidden`, `margin-top:3px`, `border-radius:5px`) and inner `.bar { height:100% }`;
the API-derived percentage remains the dynamic StyleX width carrier. The focused test passed
`1/1` with the fallback enabled and `1/1` with `VITE_DISABLE_LEGACY_FALLBACK=1`, covering
desktop and mobile viewports. The remaining global baseline is still red, so fallback removal
and shared-selector retirement remain deferred.

## Second bounded repair wave

The organization-members mobile row owner was repaired from the frozen responsive cascade. The
existing member-row StyleX owner now carries the exact `width:100vw` mobile declaration beside
the existing `min-width:95%`, desktop span width, and `margin-left:5px`; legacy member DOM,
classes, and role/delete behavior remain unchanged. The focused list test passes `3/3` with the
fallback enabled and `3/3` with `VITE_DISABLE_LEGACY_FALLBACK=1`, covering populated/empty
desktop/mobile row and list geometry. The remaining outer document-width difference is not
assigned to this route owner and remains in the global/shared bridge lane.

## Candidate review — organization creation/settings

The organization creation screen was replayed with fallback disabled. Its focused contract had
three behavioral/static passes, but both desktop and mobile geometry checks reported a 1px short
legend-to-name-field gap (`46px` versus the legacy `47px`). The frozen `.frm-wrap dt` declaration
is already reproduced exactly (`margin: 3px 0 1px 0`); changing it to `2px` would be an invented
compensation. The Bootstrap `label { display: block; margin-bottom: 5px; }` hypothesis was also
replayed and produced `45px`, so this candidate remains un-repaired pending a source-backed DOM or
cascade explanation.

The organization settings candidate was not selected: its focused fallback-off check failed only
because the test still expects the retired `organization-setting-body` owner marker, while the
route emits the current split owners. This is a stale test contract, not evidence for a frozen
CSS owner migration. No route, test, frozen asset, or fallback boundary was changed for either
candidate.

## Candidate review — site/project probes

Additional focused probes did not produce a valid new CSS-owner wave. The project milestone and
pull-request creation checks target legacy sample fixtures that are not rendered by the current
route tree; the site update title checks likewise fail before title geometry because the fixture
response does not produce the expected content. The site user-list listhead contract reads the
project code-branch source and compares an unscoped fallback fixture against a scoped StyleX owner,
so its failures are stale test scope rather than evidence for a route declaration.

The site-update responsive grid contract passed fallback-off (`1/1`) across available/current/error
states and desktop/tablet/mobile geometry. Organization issue search and quick-search contracts
also passed fallback-off (`1/1` each). No implementation or focused E2E file was changed during
these probes; the fallback remains enabled by default.

## Candidate review — projects directory row content

The projects row-content contract passed its fallback-off source/owner check, but desktop and
mobile geometry both exposed a real residual: the header and description line boxes were `18px`
instead of the expected `20px`, moving the row content upward by `6px` and shortening the row.
The exact frozen Bootstrap `line-height:20px` declaration was replayed in the existing route-local
identity owner; it corrected the line-box heights, but left a `2px` content-origin difference.
No frozen declaration supports a route-local `2px` compensation, so the candidate remains blocked
without changes. The fallback remains enabled by default.

## Candidate review — organization directory responsive search

The `/orgs` focused contract exposed a valid responsive owner gap: the legacy mobile cascade sets
`.search-wrap` height to `inherit` and `.search-bar .textbox` width to `inherit !important`. A
route-local StyleX trial reproduced those declarations and made the input fit the 390px viewport,
but fallback-off still rendered the search button at `0px` width because its `yobicon` glyph depends
on the shared frozen `yobicon` `@font-face` currently supplied by the legacy fallback stylesheet.
Adding a route-local button width would invent geometry not present in the frozen source. The
responsive owner therefore remains blocked in the shared font-boundary lane; no route or focused
E2E changes were retained, and the fallback remains enabled by default.

## Candidate review — site data administration probes

The site data sidebar contract passed its source, owner, links, SPA navigation, and repeated-owner
checks (`4/5`) with fallback disabled. Its single failure is a synthetic fallback comparison: the
test creates a new unstyled `<ul>` whose browser default `list-style: disc` is compared against the
StyleX-owned `none`; it is not a rendered route mismatch. The site data page/grid/column contract
passed all fallback-off desktop/mobile checks (`3/3`). No implementation or focused E2E files were
changed, and the fallback remains enabled by default.

## Candidate review — `/projects` directory search

The focused `/projects` source and filter-interaction checks pass with the legacy fallback
disabled. Exact frozen declarations now cover the project tab `margin-bottom:-2px`, the shared
form-control `font-size:12px`, the responsive search-wrap/search-bar cascade, and the Vite-owned
Yobicon font boundary; control/icon widths and heights match the expected output.

Desktop and mobile fallback-off geometry still reports a uniform 3px upward shift for the search
wrap and all descendants. The normal fallback-enabled run retains a uniform 1px upward shift.
The frozen project-page, title-area, Bootstrap nav-tab, and responsive declarations were inspected
and are already represented; no remaining declaration explains the shift. The fallback remains
enabled by default for this state, and no invented offset or weakened assertion was retained.

The follow-up typography probe confirms the mobile input now computes to the frozen `16px` rule
with fallback disabled while desktop remains `12px`. This removes the input-font consumer gap but
does not move the search ancestor: the fallback-off wrap and descendants remain uniformly 3px
high, so the residual is retained for shell/fallback-boundary investigation rather than patched
with a route-local offset.

## Follow-up — breadcrumb tab selector scope

The directory tabs are outside `.project-page-wrap`, so the applicable frozen Bootstrap rule is
`margin-bottom:-1px`; the frozen `-2px` declaration is scoped to other project-page tabs. After
correcting this owner, the normal `/projects` contract passes 4/4, including desktop/mobile
geometry. Fallback-off source and interaction pass, while the search ancestor remains uniformly
2px high. This residual is retained as a shell/fallback-boundary gap with no local compensation.

## Follow-up — `/projects` shell/control reset closure

The remaining fallback-off residual was traced to frozen shared resets: `_page.less:6801-6808`
requires the authenticated admin affix to use a 20px line height, while Bootstrap
`bootstrap.css:116-125,138-154` supplies the input/button vertical alignment, line-height, and
pointer cursor defaults. Existing StyleX owners now carry those exact declarations. Normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` focused runs cover source, desktop/mobile geometry, and filter
submission; no offset or assertion relaxation was added.

## Follow-up — `/projects` populated row-content line boxes

The focused row-content candidate initially passed with the fallback enabled but fallback-off
exposed 18px header/description line boxes and a two-pixel mobile row-height deficit. The
existing header, description, name-tag, and stats owners now carry the frozen Bootstrap body
`line-height:20px` declaration. Normal and `VITE_DISABLE_LEGACY_FALLBACK=1` runs pass source,
desktop/mobile geometry, and containment checks 3/3 each; no compensating offset was added.

## Follow-up — global GNB search-form class and icon boundary

The focused GNB search-form candidate exposed two fallback-off-only gaps: the
semantic `gnb-search-form` class was absent, and the search glyph had no
React-owned font/glyph presentation when the legacy fallback stylesheet was
disabled. The existing form now retains the semantic class while continuing to
drop plugin-only `input-prepend`; the Vite-owned Yobicon font and exact frozen
search glyph declarations are applied to the existing icon owner through
StyleX. Normal and fallback-off focused checks pass 10/10, including desktop
and mobile outer geometry, scope switching, and the legacy GET payload. No
offset, timeout workaround, or UX change was added.
