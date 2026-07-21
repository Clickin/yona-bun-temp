# Fallback-off parity: issue-detail edit/delete actions

Batch 767 owns the exact spacing of the issue-detail edit/delete controls in
both legacy action rows. The frozen output sources are
`yona-original/app/views/issue/view.scala.html:235-244,421-430`; declarations
are frozen in `_common.less:206,216` and `_page.less:2956,3550`.

Normal and fallback-off focused E2E both pass 1/1. The test confirms two edit
and two delete owners, computed `margin-left:10px` plus `padding-top:5px` for
edit, computed `margin-left:6px` for delete, no inline styles, row containment
and ordering, edit navigation, and delete-modal interaction. Generic utility
fallback and unrelated translation/comment controls remain outside this batch.
