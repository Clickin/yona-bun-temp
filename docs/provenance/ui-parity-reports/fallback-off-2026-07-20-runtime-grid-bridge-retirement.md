# Source-less runtime-grid fallback bridge retirement — 2026-07-20

## Scope

This bounded formal retirement deletes exactly these four inactive standalone
`frontend/src/app.css` selector blocks (13 declarations total):

```css
.runtime-grid
.runtime-grid div
.runtime-grid dt
.runtime-grid dd
```

No route TSX, frozen `yona-original` source, theme variable, generated-fallback
selector inventory, DOM order, or behavior changes. A later production build may
update only the deterministic `app.css` source SHA-256 in the fallback manifest;
it must not modify the frozen generated fallback asset or selector inventory.

## Source and no-emitter evidence

Frozen `project/home.scala.html:95-120` establishes the actual project right
rail as `.span3.span-right-pane > .bubble-wrap.gray.project-home`, with an
optional milestone and `.inner.member-info`. The complete frozen view, LESS,
CSS, and JavaScript inventory contains no `runtime-grid` class or selector.
Current production `frontend/src/**/*.{ts,tsx}` has no static or dynamic
emitter either. Historical provenance records that the temporary workspace grid
and project dashboard grid were removed in favor of this legacy output.

The focused static contract was deliberately RED before deletion because all
four selector prefixes existed, then GREEN afterward by rejecting each exact
prefix. No declaration moves to StyleX: there is no remaining React owner for
the temporary structure.

## Bounded runtime matrix

The dedicated populated `/admin/sample` fixture mocks only the current project
container/session boundary and asserts the retained legacy right rail,
`project-home-side-panel`, member-info owner, ordered button/milestone/member
structure, and no `.runtime-grid` DOM. Normal output links the generated
fallback stylesheet; fallback-off output omits that link while preserving the
same visible retained structure.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "runtime-grid fallback bridge has no remaining selectors|project home retains the legacy right rail without the dead runtime-grid bridge" \
  tests/legacy-fallback-off.e2e.ts

VITE_DISABLE_LEGACY_FALLBACK=1 \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node \
  ../scripts/run-playwright-e2e.mjs --timeout=30000 \
  -g "project home retains the legacy right rail without the dead runtime-grid bridge" \
  tests/legacy-fallback-off.e2e.ts
```

Both isolated runs passed on 2026-07-20. The static exact-absence contract also
passed after deletion.

## Discovery boundary

Global fallback-off discovery remains incomplete and non-green. This report
does not claim generated fallback unlinking or live-legacy visual parity.
