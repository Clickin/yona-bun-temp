# Fallback-off parity report — posting-history modal trigger bridge

## Scope

This wave removes only the unreachable
`.board-view .posting-history > button[data-toggle="modal"]` rule from
`frontend/src/app.css`. Legacy issue and board templates used a plugin anchor
with `data-toggle="modal"`; the React issue/post detail controls are stateful
`button[type="button"]` elements and intentionally omit plugin attributes.

The generic `.posting-history` layout and other modal fallback rules remain in
place. No TSX, frozen Scala/LESS, generated fallback, or geometry baseline was
changed.

## Evidence

- Legacy sources: `yona-original/app/views/issue/view.scala.html:160` and
  `yona-original/app/views/board/view.scala.html:77`.
- React consumers: `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx`
  and `frontend/src/routes/$ownerName/$projectName/post/$postNumber.tsx`.
- Static contract:
  `frontend/tests/stylex-project-post-detail-modal-visibility.e2e.ts` asserts
  the exact selector is absent and conditional StyleX modal visibility remains.

## Verification

- Normal focused contract: 1 passed.
- `VITE_DISABLE_LEGACY_FALLBACK=1` focused contract: 1 passed.
- The selector has no runtime consumer because current React route source emits
  no `data-toggle="modal"` on posting-history controls.

Global fallback discovery remains incomplete/non-green; this report makes no
claim that generated fallback assets or frozen stylesheets are retired.
