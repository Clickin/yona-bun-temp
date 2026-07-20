# `.darkgray-txt` fallback-off report (2026-07-20)

The CLOSED issue due-date wrappers in project issues and milestone detail retain their legacy DOM order and conditional behavior while owning the frozen `_common.less` `#999` paint through route-local StyleX. The runtime `.darkgray-txt` token and only its `frontend/src/app.css` arm are absent; frozen LESS and generated fallback CSS remain untouched.

Focused static coverage is in `frontend/tests/legacy-fallback-off.e2e.ts`; the project issue browser contract additionally checks visible due-date text, computed `rgb(153, 153, 153)`, and runtime class absence.
