# Organization project-card stats icon parity report

Batch 843 owns the stats icon paint in the authenticated organization-home
project card.

Legacy evidence is `yona-original/app/views/organization/view.scala.html:113-135`
and the complete frozen `yobi.less` import chain. `_page.less:7013-7025`
defines the exact declarations:

- `.stats-wrap i`: `font-size:16px`, `margin-left:5px`, `margin-right:5px`
- `.yobicon-lightbulb.ramp-on`: `color:#B6DA54`
- `.yobicon-lightbulb.ramp-off`: `color:#DADADA`

`frontend/src/routes/organizations/$organizationName.tsx` applies these
declarations only to the three project-card stats icons through route-local
StyleX. The legacy icon elements/classes, count copy/order, titles, ramp state,
and icon-font fallback remain unchanged.

The focused E2E verifies provenance, owner markers/classes, counts/copy,
computed declarations/colors, desktop/mobile containment, no overflow, and no
inline styles. Managed system-Chrome normal and fallback-off runs both pass
1/1. Fallback-off checks the icon DOM and computed declarations without
claiming glyph visibility because the icon font fallback remains retained.

Live legacy rendering was unavailable, so screenshot parity remains explicitly
unverified. The approved Yoram footer intentionally differs from upstream Yona
by omitting unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream repository, and
developer-contact entries.
