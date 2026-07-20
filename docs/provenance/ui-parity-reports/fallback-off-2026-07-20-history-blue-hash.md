# Bounded StyleX parity report: dashboard alignment and pull-request hash color

## Scope

- Project dashboard pull-request metadata keeps the legacy `right-txt` alignment through the existing project-history StyleX owners.
- Pull-request changes commit hashes keep the legacy `blue-txt` paint through a route-local semantic color owner.

## Evidence

- Frozen dashboard/`viewChanges.scala.html`, LESS, and variable sources are asserted by focused contracts.
- Tests assert stable owner markers, preserved geometry/helper classes, absence of migrated utility classes, and desktop/mobile computed declarations.
- TypeScript check and source-contract Playwright checks passed; the dashboard source contract passed 1/1.
- Live dashboard/changes replay was attempted but managed-server startup/port state prevented a stable 3101 session; no live screenshot claim is made here.

## Fallback boundary

Shared `.right-txt` and `.blue-txt` declarations remain because other routes still consume them. This wave removes only the two dashboard consumers and three pull-request hash consumers.
