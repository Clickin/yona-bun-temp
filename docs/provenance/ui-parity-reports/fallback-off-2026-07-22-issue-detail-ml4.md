# Fallback-off parity: issue-detail mobile new-subtask `.ml4`

Batch 764 owns the legacy issue-detail mobile new-subtask wrapper spacing in
route-local StyleX. The frozen sources are
`yona-original/app/views/issue/view.scala.html:204` and
`yona-original/app/assets/stylesheets/less/_common.less:214`.

Normal focused E2E passes with the legacy responsive cascade: the wrapper is
hidden at desktop width, visible inline on mobile, retains its legacy classes,
and computes `margin-left: 4px` without an inline style. Fallback-off focused
E2E passes with the StyleX declaration and owner marker present, computed
`margin-left: 4px`, no inline style, and valid geometry; legacy responsive
visibility is intentionally not asserted because the fallback cascade is
disabled.
