# `.ml4`/`.mr3` fallback-off report (2026-07-23)

The current React/TSX runtime inventory emits neither `.ml4` nor `.mr3`.
`frontend/src/app.css` therefore no longer carries either React-side utility
bridge. The frozen LESS declarations and generated
`frontend/public/legacy-assets/stylesheets/legacy-fallback.css` remain intact
for legacy/plugin output.

The focused managed dynamic-port system-Chrome contract
`frontend/tests/legacy-fallback-off.e2e.ts -g "source-less ml4 and mr3"` passed
1/1 in normal mode and 1/1 with
`VITE_DISABLE_LEGACY_FALLBACK=1`. No route DOM or screenshot geometry changed;
this is a bounded static fallback retirement only.
