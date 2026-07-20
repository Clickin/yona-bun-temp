# `.gray-txt` fallback retirement (2026-07-20)

The three runtime separator spans retain their legacy `/` and `|` DOM order while owning
the frozen `#ccc` paint through colocated StyleX. `frontend/src/app.css` no longer emits
`.gray-txt`; frozen legacy LESS and generated CSS remain unchanged.

Focused static coverage: `frontend/tests/stylex-gray-text-retirement.e2e.ts`.
