# Pull-request tab button fallback bridge retirement — 2026-07-20

## Scope

This bounded retirement removes only the three `.pullrequeset-tab-menu`
button rule groups from `frontend/src/app.css`: the base button rule, its
hover/focus rule, and its active-state rule. The typoed selector is retained
as frozen legacy evidence and in the generated fallback asset; no frozen or
generated CSS was edited.

## No current emitter

The frozen project and organization pull-request templates use the historical
`.pullrequeset-tab-menu` class and anchor/plugin cascade. Current React project
and organization pull-request routes do not emit that typoed class and own
their tab controls through route markup and StyleX. Generic `.nav-tabs` anchor
rules remain in `app.css` for active consumers.

## Managed checks

Normal and `VITE_DISABLE_LEGACY_FALLBACK=1` runs of the focused project,
organization, and fallback-off contracts each pass 3/3 tests, including
desktop/mobile containment checks. Global fallback discovery remains
incomplete/non-green; this report is not a generated asset unlinking or
live-legacy visual-parity claim.
