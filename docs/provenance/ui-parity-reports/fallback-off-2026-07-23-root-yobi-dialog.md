# Root Yoram dialog center alignment — 2026-07-23

Batch 833 moves the visible confirmation-row alignment for the global
`#yobiDialog` state into the existing root StyleX boundary, then retires only
the React-side `.center-txt` bridge from `frontend/src/app.css`.

## Legacy evidence and ownership

The output DOM is preserved from
`yona-original/app/views/common/scripts.scala.html`: the `#yobiDialog`
modal/message shell, `.center-text` message block, `.center-txt buttons` action
row, confirm button copy, and dismiss behavior. The exact alignment declaration
is frozen in `yona-original/app/assets/stylesheets/less/_common.less:162`,
imported through `yona-original/app/assets/stylesheets/yobi.less:1-13` along
with `_variables.less`, `_mixins.less`, `_common.less`, `_sprites.less`,
`_page.less`, `_responsive.less`, and the remaining legacy imports.

`frontend/src/routes/__root.tsx` retains the legacy `center-txt buttons`
classes for DOM parity while `rootYoramDialogActionRow` owns
`textAlign: "center"` and is exposed through the stable
`root-yoram-dialog-action-row` owner marker. Other legacy `.center-txt`
consumers and route-owned modal states remain fallback-owned.

## Verification

`frontend/tests/stylex-root-yobi-dialog.e2e.ts` covers frozen source mapping,
owner/source isolation, hidden/visible modal state, confirm interaction, and
desktop/mobile action-row containment and centering. The formal
`legacy-fallback-off.e2e.ts` contract checks that `.center-txt` is absent from
`app.css`, retained in generated `legacy-fallback.css`, and owned by the root
StyleX consumer. Focused managed-port system-Chrome normal/fallback-off runs
pass 3/3 for the root dialog suite and 1/1 for the fallback bridge contract.
Live legacy rendering remains unavailable where the focused evidence records
it; no screenshot parity claim or compensating geometry is added.

The approved Yoram footer/provider/developer-contact/repository differences
remain intentional user-authored deviations and are not restored.
