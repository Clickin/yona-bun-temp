# Fallback-off report: `.uneditable-input` bridge

Batch 590 removed only the dead React-side `.uneditable-input` selector arm
from `frontend/src/app.css`. The frozen Bootstrap rule remains unchanged for
legacy evidence. Current React source has no `.uneditable-input` emitter, while
the shared `input, textarea { width: 206px; }` contract remains.

The formal fallback-off contract asserts both selector absence and retained
generic width ownership. No generated fallback asset or geometry baseline was
changed.
