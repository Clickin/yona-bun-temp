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
