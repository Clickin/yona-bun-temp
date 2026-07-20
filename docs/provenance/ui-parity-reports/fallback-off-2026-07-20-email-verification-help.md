# Fallback-off report: email verification helper

Batch 599 retires only the React-side `.login-form-wrap .email-verification-help`
rule from `frontend/src/app.css`. The frozen Scala login template and generated
`legacy-fallback.css` remain unchanged as legacy evidence.

- `loginform.tsx` renders the enabled helper through
  `data-stylex-owner="standalone-login-verification-help"` and emits no legacy
  `email-verification-help` class.
- `-loginform.stylex.ts` owns the helper's padding, margin, font size, and weight.
- Focused contracts assert app.css absence, generated fallback retention,
  enabled/disabled/social-only states, and desktop/mobile geometry.

Global fallback-off discovery remains incomplete/non-green; this bounded report
does not claim full fallback retirement.
