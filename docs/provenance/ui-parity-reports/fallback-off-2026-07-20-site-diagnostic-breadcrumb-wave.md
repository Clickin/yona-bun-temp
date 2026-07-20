# Fallback-off parity report: `/sites/diagnostic` breadcrumb (2026-07-20)

## Scope

This wave migrates only the site-management breadcrumb rendered by
`/sites/diagnostic`:

```text
div.site-breadcrumb-outer
  div.site-breadcrumb-inner
    h3 Site management
```

The legacy source of truth is `yona-original/app/views/site/siteMngLayout.scala.html:34-38`.
Frozen `_page.less:743-753` supplies the inner auto margin and heading
line-height/padding. Frozen `_responsive.less:349-351,627-631` supplies the
mobile minimum width and outer width/padding/box-sizing rules.

Legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.

## Implementation boundary

`frontend/src/routes/sites/diagnostic.tsx` replaces only the two raw
presentation classes with three route-local StyleX owners:

- `site-diagnostic-breadcrumb-outer`: `box-sizing`, responsive `min-width`,
  `padding`, and `width`.
- `site-diagnostic-breadcrumb-inner`: centered margin.
- `site-diagnostic-breadcrumb-heading`: legacy line-height and padding.

DOM order, `site.sidebar` copy, page/grid/title/sidebar output, and diagnostic
and update TanStack Query behavior are unchanged. No frozen source, `app.css`,
theme, generated fallback asset, or other breadcrumb consumer was changed.

## Verification

Static contract and browser geometry tests are in
`frontend/tests/stylex-site-diagnostic-breadcrumb.e2e.ts`.

Normal managed run:

```text
PLAYWRIGHT_EXIT=0
3 passed (static, desktop 1366px, mobile 390px)
```

Fallback-off managed run (`VITE_DISABLE_LEGACY_FALLBACK=1`):

```text
PLAYWRIGHT_FALLBACK_OFF_EXIT=0
3 passed (static, desktop 1366px, mobile 390px)
```

`pnpm --dir frontend check` and `git diff --check` pass. The full fallback
manifest remains active for unrelated consumers; this report does not claim
global fallback unlinking or complete live legacy visual parity. Raw breadcrumb
consumers in mail, search, and other routes remain outside this wave.
