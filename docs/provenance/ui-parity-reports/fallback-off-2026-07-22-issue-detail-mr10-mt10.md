# Fallback-off parity: issue-detail desktop metadata `.mr10`/`.mt10`

Batch 766 owns the legacy issue-detail desktop date/state wrapper spacing in a
route-local StyleX owner. The frozen sources are
`yona-original/app/views/issue/view.scala.html:111` and
`yona-original/app/assets/stylesheets/less/_common.less:207-208`, imported by
`yona-original/app/assets/stylesheets/yobi.less`.

Normal focused E2E passes with the legacy responsive cascade: the wrapper is
visible at desktop width, preserves its date/state content and structural
classes, computes `margin-right: 10px` and `margin-top: 10px` without inline
style, and is hidden at the mobile breakpoint. Fallback-off focused E2E passes
with the same computed StyleX margins and desktop geometry; mobile assertions
avoid assuming the disabled legacy responsive visibility cascade.
