# Fallback-off attachment insert bridge retirement — 2026-07-20

Batch 581 retires only the unreachable app.css rules for `.attached-file
.btn-insert`, its hover state, and `.attached-file.complete .btn-insert`.
Current React issueform output uses the translated `btn-insert-copy` control
and owns its presentation through StyleX; no current React runtime emits the
legacy `btn-insert` class. Frozen file-uploader Scala/CSS and generated legacy
fallback remain unchanged for legacy/plugin output.

The focused attachment-row and formal fallback-off contracts pass in both
modes. Existing `.attached-file`, progress, delete, and upload rules remain
active.
