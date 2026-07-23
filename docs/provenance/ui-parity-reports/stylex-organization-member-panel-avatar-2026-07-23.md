# Organization member-panel avatar parity report

Batch 845 owns the avatar wrapper/image cascade for the authenticated
organization-home manager and member panels.

Legacy evidence is `yona-original/app/views/organization/view.scala.html:34-41`
(`makeUser`) and `141-177` (both panel lists), with the complete frozen
`yobi.less` import chain. `_yobiUI.less:439-466` defines:

- `.avatar-wrap`: 32px square, inline-block, middle aligned, clipped, gray,
  and 3px rounded
- nested image: `width:100%` and `vertical-align:top`

`frontend/src/routes/organizations/$organizationName.tsx` applies only these
declarations to the panel avatar wrapper and image. Legacy `avatar-wrap`, Link
href/title, 45px image attributes, alt, user copy/order, and responsive layout
remain unchanged.

The focused E2E verifies provenance, both panel avatar owners/classes/links/
titles/attributes/copy/order, computed wrapper/image declarations, desktop/
mobile containment, no overflow, and no inline styles. Managed system-Chrome
normal and fallback-off runs both pass 1/1.

Live legacy rendering was unavailable, so screenshot parity remains explicitly
unverified. The approved Yoram footer intentionally differs from upstream Yona
by omitting unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream repository, and
developer-contact entries.
