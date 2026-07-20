# `.label-info` paint-arm fallback-off report

## Scope

This bounded retirement removes only the React-side `.label-info` paint arm
from `frontend/src/app.css`. Current React production TS/TSX emits no runtime
`label-info`; massmail selected-project tags and site-user-list actions use
route-local StyleX owners instead. Frozen Scala/legacy JS/Bootstrap and the
generated fallback remain unchanged as legacy output evidence.

Legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.

## Contracts

- The massmail focused source contract retains the frozen
  `yobi.site.MassMail.js` `<span class="label label-info">` evidence while
  asserting app.css has no `.label-info` arm.
- `legacy-fallback-off.e2e.ts` asserts both `.label-info` and `.badge-info`
  app.css arms are absent.
- Generic `.label`, `.badge`, frozen Bootstrap, and generated fallback remain
  outside this retirement. No DOM, route, or interaction changes are made.

The focused massmail source/browser contract passes in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes (`1/1` each); the formal dead-label
static contract also passes. These runs preserve the selected-project tag
owner and verify the frozen legacy `<span class="label label-info">` evidence
without retaining the React fallback arm.

Global fallback-off discovery remains incomplete/non-green; this report does
not claim global fallback stylesheet unlinking or migration completion.
