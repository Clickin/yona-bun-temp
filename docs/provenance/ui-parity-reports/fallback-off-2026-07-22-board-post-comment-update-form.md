# Fallback-off parity: board-post open comment-update form

Date: 2026-07-22  
Route/state: authenticated populated `/admin/sample/post/1`, parent comment edit open  
Batch: 796

## Evidence and ownership

`board/view.scala.html` includes `board/partial_comments.scala.html`, which
includes `common/commentUpdateForm.scala.html`. Frozen `_page.less` rules around
3019–3028, 3467–3490, and 5681–5694 through complete `yobi.less` order supply
the form hidden baseline, direct write-box padding, update textarea-box final
cascade, and action-row spacing.

Four route-local groups now own those exact declarations. The Scala form
action/method/encoding, hidden comment id, editor/upload/action order, and
Upload/Cancel/Save copy remain intact; React/TanStack continues to own edit,
cancel, and save mutation state. The old visible-only style is removed.

Textarea element declarations, editor tabs/panes/help/preview, upload internals,
file/button paint, notification receiver, attachments, the new-comment form,
and child forms remain lower fallback consumers and are not claimed here.

## Verification

- RED: system Chrome failed while the `commentUpdateForm` owner was absent.
- Explicit outside-sandbox system-Chrome normal and fallback-off runs pass 1/1
  each at 1366px and 390px, covering hidden/open state, all four computed owner
  groups, direct scope, form contracts, order/containment/no-overlap, cancel,
  and save mutation.
- Directly opened legacy/local screenshots were captured and inspected:
  desktop forms are both `948.33px` wide with heights `319.58/320.58px`;
  mobile forms are both `384px` wide with heights `379.58/380.58px`.
  The local form is 2px above legacy, consistent with the existing state-time
  offset. The target padding and action alignment are visually equivalent.
- Footer/navbar differences remain the approved Yoram identity/contact
  deviation and are outside this form-state wave.

Frozen legacy source hashes remain unchanged.
