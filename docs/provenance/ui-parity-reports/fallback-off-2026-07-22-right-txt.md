# Fallback-off report: `.right-txt` bridge retirement

Batch 758 reviewed the complete current React consumer graph for `.right-txt`.
`rg -l "right-txt" frontend/src` returned no route/component emitter; the only
React-side occurrence was the bridge in `frontend/src/app.css`.

The frozen legacy utility remains evidenced by `_common.less:163` and legacy
view roots including `common/commentForm.scala.html`, `common/reviewForm.scala.html`,
`common/uploadForm.scala.html`, `code/diff.scala.html`, and `issue/view.scala.html`.
The generated `legacy-fallback.css` is intentionally retained and still
contains `.right-txt` for historical consumers.

The batch deletes only the app.css block and adds a static contract in
`frontend/tests/legacy-fallback-off.e2e.ts` proving app.css absence alongside
generated-fallback retention. The focused fallback-off contract passes 1/1.
