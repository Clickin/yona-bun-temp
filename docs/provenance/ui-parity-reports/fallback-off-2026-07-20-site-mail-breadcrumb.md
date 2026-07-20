# `/sites/mail` breadcrumb fallback-off parity

Batch 570 ports only the site-management breadcrumb boundary in
`frontend/src/routes/sites/mail.tsx`.

- Legacy output source: `yona-original/app/views/site/siteMngLayout.scala.html:34-38`
  and `site/mail.scala.html:23`; frozen geometry comes from
  `app/assets/stylesheets/less/_page.less:743-753` and
  `_responsive.less:349-351,627-631`.
- `site-mail-breadcrumb-outer`, `site-mail-breadcrumb-inner`, and
  `site-mail-breadcrumb-heading` preserve the legacy outer > inner > `h3`
  order, copy, and desktop/mobile geometry. The raw breadcrumb classes are no
  longer emitted by this route.
- Focused evidence: `frontend/tests/stylex-site-mail-breadcrumb.e2e.ts`.
  Static, desktop 1366px, and mobile 390px checks pass 3/3 in both normal and
  `VITE_DISABLE_LEGACY_FALLBACK=1` managed-server runs, each exit 0. Screenshots
  are saved under `output/playwright/visual-sweep/`.
- No `app.css`, theme, generated fallback, or frozen legacy source changed.
  This report does not claim global fallback unlinking or complete fallback
  discovery; remaining consumers require separate evidence.
