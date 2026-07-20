# Fallback-off modal/voter trigger bridge — 2026-07-20

## Scope

This wave removes the unreachable plugin-trigger block from `frontend/src/app.css`:

- `.posting-history > button[data-toggle="modal"]`
- `.voter-list li > button[data-toggle="modal"]`
- `.vote-description-people[data-toggle="modal"]`

Current React issue/post detail controls use stateful `button[type="button"]`
and emit no `data-toggle="modal"`; the legacy Scala plugin anchors are retained
only as output/UX evidence. Generic modal rules and the frozen/generated
voter-list and posting-history styling remain unchanged.

## Evidence

The post-detail and issue-detail modal static contracts and the formal
`legacy-fallback-off.e2e.ts` contract assert exact selector absence and retained
modal ownership in both normal and fallback-off modes. The removed selectors
matched no current React DOM, so no screenshot or geometry baseline changed.
Managed runs pass 3/3 in normal mode and 3/3 with
`VITE_DISABLE_LEGACY_FALLBACK=1`.

Global fallback discovery remains incomplete/non-green.
