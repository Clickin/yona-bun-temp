# Organization project-card child paint parity report

Batch 842 owns the remaining private-lock and owner-name-small paint in the
authenticated organization-home project card.

Legacy evidence is `yona-original/app/views/organization/view.scala.html:80-110`
and the complete frozen `yobi.less` import chain. `_page.less:1862-1870`
defines:

- private `.yobicon-lock` color `#7F8C8D`
- `.owner-name-small` color `#999`
- `.owner-name-small` font size `19px`

`frontend/src/routes/organizations/$organizationName.tsx` applies only these
declarations through route-local StyleX. The private-state conditional, legacy
classes, Link target, owner copy, DOM order, and icon-font fallback remain
unchanged.

The focused E2E verifies provenance, owner markers/classes/attributes/copy,
computed colors/font size, desktop/mobile containment, and no inline style.
Managed system-Chrome normal and fallback-off runs both pass 1/1. With the
legacy fallback stylesheet removed, the icon glyph can be hidden because its
font/visible glyph contract remains fallback-owned; the test therefore checks
the icon DOM and StyleX color in fallback-off mode, while requiring visible
glyph geometry in normal mode.

Live legacy rendering was unavailable, so screenshot parity remains explicitly
unverified. The approved Yoram footer intentionally differs from upstream Yona
by omitting unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream repository, and
developer-contact entries.
