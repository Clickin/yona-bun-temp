# Frontend StyleX pilot

Status: Phase 3 pilot, 2026-07-13

## Scope

This pilot establishes the official `@stylexjs/unplugin` Vite integration and
migrates one React-owned state boundary. It does not migrate or replace the
frozen legacy CSS/LESS baseline.

| Evidence | Current implementation | Decision |
| --- | --- | --- |
| `yona-original/app/views/layout.scala.html` renders the page body and legacy scripts without an event-capture wrapper. | `frontend/src/routes/__root.tsx` adds a transparent wrapper solely to own React click and key capture for the root login/modal behavior. | Keep the wrapper element, DOM order, and React event handlers; move only its `display: contents` declaration to StyleX. |
| The wrapper previously used inline `style={{ display: "contents" }}`. | `stylex.create` and `stylex.props` now provide the same computed display. | This is React-owned behavior evidence, not a translation of legacy visual styling. |
| `@stylexjs/unplugin` supports Vite through `stylex.vite()` and defaults development mode to full HTML injection. | `frontend/vite.config.ts` places `stylex.vite()` before the route, React, and Babel transforms. | Use the plugin default; no manual HTML injection or extra runtime shim. |

## Parity boundary

- No element, legacy class, handler, DOM order, copy, route, or API contract changed.
- No frozen file under `yona-original/app/assets/stylesheets/**` or legacy
  Bootstrap CSS changed.
- No numeric compensation or route-specific geometry value was introduced.
- The focused browser check proves that the wrapper still computes to
  `display: contents`, has no inline style, and receives StyleX development
  CSS.
- No screenshot pair was captured for this transparent wrapper because
  `display: contents` creates no visual box. The focused browser check pins the
  computed display and lack of an inline style; later pilots that own visible
  geometry still require desktop/mobile screenshot comparison.

## Verification and known baseline

- Required checks: frontend typecheck, production build, and
  `stylex-root-boundary.e2e.ts`. All three pass; production output contains the
  extracted `display:contents` rule and the focused browser suite passes 2/2
  against the real Rust backend.
- Phase 2 inherited the Phase 1 green Router typecheck baseline. Any Router
  failures observed while validating this pilot are baseline/integration
  failures to record explicitly; they are not to be hidden by StyleX casts or
  route changes.
- This pilot deliberately leaves all other inline and legacy CSS-owned styles
  unchanged. Later migrations must remain isolated and independently
  screenshot-verifiable.
