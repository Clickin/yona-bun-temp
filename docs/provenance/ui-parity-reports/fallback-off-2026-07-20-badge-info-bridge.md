# Fallback-off report: dead `.badge-info` bridge

Batch 595 retires only the React-side `.badge-info` arm from the shared
`.label-info, .badge-info` rule in `frontend/src/app.css`. Current React
sources have no `.badge-info` consumer; the active `.label-info` declaration
remains for legacy label output and frozen Bootstrap source is unchanged.

The formal `legacy-fallback-off.e2e.ts` static contract asserts that the
`.badge-info` arm is absent while `.label-info` retains its info paint in both
normal and `VITE_DISABLE_LEGACY_FALLBACK=1` modes. This bounded cleanup does
not claim global fallback discovery completion.
