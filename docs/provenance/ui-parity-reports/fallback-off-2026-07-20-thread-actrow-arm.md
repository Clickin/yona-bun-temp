# `.thread-actrow` grouped-arm fallback-off report

## Scope

This bounded retirement removes only the React-side `.thread-actrow,` arm
from the grouped flex selector in `frontend/src/app.css`. Current React
production TS/TSX emits no `thread-actrow`; the active `.actions` sibling stays
unchanged. Frozen/generated legacy CSS remains intact for the legacy
`partial_comment_form_on_thread.scala.html` output and `yobi.code.Diff.js`
behavior evidence.

Legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.

## Contracts

- Commit detail and pull-request changes focused contracts retain `.actions`,
  prove React no-emitter, and preserve frozen `.thread-actrow` evidence.
- `legacy-fallback-off.e2e.ts` asserts `.thread-actrow,` absence from
  `frontend/src/app.css` while requiring `.actions {` to remain.
- Normal and `VITE_DISABLE_LEGACY_FALLBACK=1` browser runs cover commit/PR
  review forms at desktop and mobile sizes; no generated/frozen CSS is changed.

The static commit/PR/formal contracts pass `3/3`. Pull-request review browser
parity passes in normal and fallback-off modes (desktop/mobile matrix, `1/1`
each). The commit review browser file retains a pre-existing stale assertion
for `style={{ border: 0 }}` after its earlier StyleX border migration, so that
file's browser test is not evidence for this CSS-only retirement; the new
thread-arm static contract itself passes.

Global fallback-off discovery remains incomplete/non-green. This report does
not claim global fallback stylesheet unlinking or completion of migration.
