# Fallback-off pull-request Select2 bridge contract — 2026-07-20

The create/edit pull-request contract was run against the managed frontend with
`VITE_DISABLE_LEGACY_FALLBACK=1`. It passed 2/2 tests:

- `stylex-pull-request-create-edit-geometry.e2e.ts` confirms the scoped
  `.pull-request-wrap .select2-container > button.select2-choice` app.css
  bridge is absent while the frozen wrapper contracts remain owned by StyleX.
- `stylex-project-new-pull-request-form-inline-residual.e2e.ts` confirms the
  create route's branch picker remains 220px wide, has a closed Select2 state,
  and preserves the responsive editor geometry.

The create route's `styles.select2Choice` declaration is the sole runtime owner
of the removed button declarations. The edit route emits native disabled
selects under `.pull-request-wrap`, so no matching consumer was dropped. No
frozen source, generated fallback, or geometry baseline changed. This report is
limited to the exact Select2 bridge; global fallback discovery remains
incomplete/non-green.
