# Batch 654 fallback refresh decision

The current `frontend/src/app.css` selector inventory was compared with the
complete production React/TSX source inventory and frozen `yona-original`
Scala/LESS/JavaScript/CSS sources.

No additional safe source-less fallback bridge remains. The only unmatched
families are:

- `hljs-*`: syntax-highlighting/plugin-generated output; deferred until its
  runtime producer and exact frozen declaration boundary are available.
- `.issue-form-project-header`: no current emitter and no frozen selector or
  declaration evidence; deletion would be unsupported, so it remains deferred.

No `app.css`, route, frozen source, generated fallback, or StyleX owner changed
in this decision. The selector inventory is evidence for classification only;
it does not claim global fallback-off completion.
