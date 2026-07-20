# Fallback-off report: `.form-horizontal` bridge

Batch 598 removes the React-side `.form-horizontal` compatibility block from
`frontend/src/app.css`. Current React site forms do not emit the legacy form
classes; frozen Scala templates and generated fallback remain unchanged for
legacy evidence. Focused normal and fallback-off contracts assert the dead
selector absence and preserve the StyleX-owned form geometry.
