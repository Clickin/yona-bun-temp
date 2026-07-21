# Fallback-off parity: issue-detail translation button `.ml10`

Batch 768 owns the configured issue-detail translation button spacing in a
route-local StyleX owner. The frozen sources are
`yona-original/app/views/issue/view.scala.html:232` and
`yona-original/app/assets/stylesheets/less/_common.less:206`, imported by
`yona-original/app/assets/stylesheets/yobi.less`.

Normal and fallback-off focused E2E both pass 1/1. The test confirms the
conditional `#translate` button retains its icon/title/disabled behavior,
computes `margin-left: 10px` without inline style, and still performs the
translation request. Comment translation buttons and unrelated `.ml10`
consumers remain outside this batch.
