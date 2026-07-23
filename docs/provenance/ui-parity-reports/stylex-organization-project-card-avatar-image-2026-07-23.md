# Organization project-card owner avatar image parity report

Batch 841 owns the organization-home project-card owner avatar image in the
React route.

Evidence is `yona-original/app/views/organization/view.scala.html` and the
complete frozen `yobi.less` import chain. `_page.less:1837-1910` defines the
existing `.owner-avatar-wrap` and its nested image declarations:

- `vertical-align: top`
- `width: 100%`
- `height: 100%`

`frontend/src/routes/organizations/$organizationName.tsx` applies these
declarations through route-local StyleX. The existing wrapper, Link, legacy
classes, image attributes, search filtering, and conditional blank-logo branch
are unchanged. No inline style or geometry compensation was added.

The focused E2E verifies static provenance, rendered owner/attributes, blank
logo behavior, filtering, desktop/mobile containment, and normal/fallback-off
system-Chrome runs. Both modes pass 1/1. The frozen inline/replaced-element
cascade can produce intrinsic/automatic pixel results, so this slice verifies
the exact declarations and positive rendered image bounds rather than
normalizing pixels.

Live legacy rendering was unavailable; screenshot parity remains explicitly
unverified. The approved Yoram footer intentionally differs from upstream Yona
by omitting unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream repository, and
developer-contact entries.
