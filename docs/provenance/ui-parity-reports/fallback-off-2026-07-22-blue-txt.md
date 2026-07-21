# Fallback-off report: `.blue-txt` bridge retirement

Batch 759 reviewed the complete current React consumer graph for `.blue-txt`.
`rg -l "blue-txt" frontend/src` returned no route/component emitter; the only
React-side occurrence was the bridge in `frontend/src/app.css`.

Frozen legacy consumers remain evidenced by `git/viewChanges.scala.html`,
`organization/view.scala.html`, `code/partial_branchrow.scala.html`, and
`project/list.scala.html`; `_common.less:165` defines the historical
`color:@blue` utility. The generated `legacy-fallback.css` remains intact and
continues to contain `.blue-txt`.

The batch deletes only the app.css block and extends the existing
`frontend/tests/legacy-fallback-off.e2e.ts` shared-text contract to prove both
React-side utility arms are absent while generated fallback retention remains.
The focused normal and fallback-disabled contracts pass 1/1 each.
