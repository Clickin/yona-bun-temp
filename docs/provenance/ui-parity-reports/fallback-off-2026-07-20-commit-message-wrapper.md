# Fallback-off report: commit-message wrapper arms

## Scope

This bounded retirement removes only the React-side app.css declarations for
`.code-browse-wrap .commitInfo .commitMsg-wrap .commitMsg.short` and `.desc`.
The parent `.code-browse-wrap .commitInfo` and generic `.commitMsg` contracts
remain in place.

Legacy `yona-original/app/views/code/diff.scala.html` emits the historical
`commitMsg-wrap` wrapper, and
`yona-original/app/views/common/commitMsg.scala.html` emits the `commitMsg
short` and `commitMsg desc` children. These frozen templates remain unchanged
as output evidence. Current React route inventory has no `commitMsg-wrap`
producer; current commit and pull-request screens retain their own `commitMsg`
classes and route-local ownership.

Legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.

## Verification

`frontend/tests/project-code-commit-detail.e2e.ts` asserts the frozen wrapper
and child evidence, exact app.css selector absence, current route producer
absence, and retention of parent/generic fallback declarations.

- Normal static contract: PASS (1 test)
- `VITE_DISABLE_LEGACY_FALLBACK=1` static contract: PASS (1 test)
- Formal `legacy-fallback-off.e2e.ts` normal contract: PASS (1 test)
- Formal `legacy-fallback-off.e2e.ts` fallback-off contract: PASS (1 test)

No frozen source, generated fallback CSS, or route TSX was modified. Global
fallback discovery remains incomplete/non-green.
