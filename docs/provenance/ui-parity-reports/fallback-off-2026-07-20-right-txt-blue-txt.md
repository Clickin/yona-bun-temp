# Bounded StyleX parity report: commit-detail right alignment and branches pull-request color

## Scope

- `/$ownerName/$projectName/commit/$commitId`: five commit-detail wrappers previously consuming `.right-txt` now use the route-local `rightText` StyleX owner.
- `/$ownerName/$projectName/branches`: the pull-request state link previously consuming `.blue-txt` now uses the route-local `pullRequestLink` theme value (`#5dbbe0`).

## Evidence

- Frozen Scala templates and `_common.less`/`_variables.less` source declarations are asserted by the focused StyleX tests.
- Focused tests assert stable owner markers, absence of the migrated route classes, and desktop/mobile computed declarations.
- Typecheck, production build, StyleX build verifier, Vitest (5 files/13 tests), and `git diff --check` passed.
- The combined Playwright batch was attempted twice; the first managed-server startup timed out after 60 seconds and the explicit managed-server retry reached the tests but returned `ERR_CONNECTION_REFUSED` on `127.0.0.1:3101`. No screenshot or live geometry claim is made from that unavailable runtime.

## Fallback boundary

Shared `.right-txt` and `.blue-txt` declarations remain in `frontend/src/app.css` because unrelated route consumers still emit those classes. Only the two bounded route consumers are retired from those utilities.
