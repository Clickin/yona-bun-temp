# `.sr-only` fallback-off report

## Scope

This bounded retirement removes only the source-less `.sr-only` block from
`frontend/src/app.css`. A complete current React and legacy inventory emits no
`.sr-only`; frozen/generated CSS is unchanged. The sole remaining textual
mention is the stale historical progress note at
`docs/provenance/legacy-porting-progress.md:631`, which describes an earlier
generated heading no longer present in the current source.

Legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.

## Contract

`frontend/tests/legacy-fallback-off.e2e.ts` asserts exact `.sr-only` absence
from app.css and scans current `src/**/*.{ts,tsx}` for a runtime emitter. No
route TSX, DOM, accessibility, frozen source, or generated fallback changes
are part of this slice.

Global fallback-off discovery remains incomplete/non-green; this report does
not claim global fallback stylesheet unlinking or migration completion.
