# Organization member-panel inner parity report

Batch 844 owns the member-info inner overrides for the authenticated
organization-home manager and member panels.

Legacy evidence is `yona-original/app/views/organization/view.scala.html:141-177`
and the complete frozen `yobi.less` import chain. `_page.less:2610-2625`
defines the shared `.inner` declarations and the member-info-specific:

- `margin-right: 0`
- `height: auto !important`

`frontend/src/routes/organizations/$organizationName.tsx` applies only these
overrides to the existing member-panel inner StyleX owner. Panel order,
classes, member links/copy, leave interaction, and responsive layout remain
unchanged.

The focused E2E verifies provenance, manager/member owner markers and order,
computed inner background/font/height/margin/overflow/vertical-align, visible
copy, leave interaction, desktop/mobile containment, no overflow, and no
inline styles. Managed system-Chrome normal and fallback-off runs both pass
1/1.

Live legacy rendering was unavailable, so screenshot parity remains explicitly
unverified. The approved Yoram footer intentionally differs from upstream Yona
by omitting unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream repository, and
developer-contact entries.
