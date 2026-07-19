# Fallback-off dead-selector retirement — 2026-07-19

## Scope

Batch 537 changes the React runtime asset only. `yona-original/**/*.css` and
`yona-original/**/*.less` remain immutable evidence. `frontend/scripts/build-legacy-css.mjs`
post-processes rendered Yobi CSS to exclude exactly these separately proven consumer-free rules:

- `.all-projects .project .info-wrap .forked`
- `.all-projects .project .stats-wrap .like`, `.like .num`, and `.like .ico`
- `.profile-frmwrap .avatar-frm` and its `.avatar-wrap`, `.progress`, `.progress.loading`,
  `.btn-wrap`, and `.btn-wrap .nbtn i` descendants

The build excludes no ancestor selector and no active module. It preserves nearby
`.all-projects .project .stats-wrap .members`, `.profile-frmwrap dl`, and
`.profile-frmwrap form` rules. `frontend/src/app.css` also removes only duplicate dead
project-list declarations and dead `.milestones .desc`; the matching frozen generated Yobi rule
remains because the Yobi module still has live consumers.

## Runtime contracts

Commands:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend build:legacy-css
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e -- tests/legacy-fallback-off.e2e.ts
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e:fallback-off -- tests/legacy-fallback-off.e2e.ts
```

The normal contract fetches the generated fallback from its runtime link and checks exact retired
selector absence plus neighboring live-selector presence. The fallback-off contract checks that
the same link is absent. These are asset-boundary contracts, not a live legacy visual comparison.

## Global discovery status

The fallback-off global discovery command started 2,473 tests with five workers. The managed
harness detached before Playwright printed a final aggregate summary, so this is intentionally an
**incomplete, non-green discovery**, not a completion result and not evidence for permanent
fallback unlinking. The visible failures before detachment classify as follows:

| Visible failure family | Classification | Retirement consequence |
| --- | --- | --- |
| `global-shell-geometry` public desktop and login-dialog cases | shared global bridge / shell owner | Keep the generated fallback; investigate the root shell as a separate lane. |
| `auth-aliases`, `login-alias`, `forgot-password-alias` redirects and source checks | DOM/behavior parity | Not a stylesheet retirement signal. |
| `authenticated-home-empty-notifications` LegacyInternalLink and empty-notification DOM checks | shared home shell DOM contract | Not a selector-family proof; retain fallback. |
| `help-toc` typed target check | DOM/behavior parity | Not a stylesheet retirement signal. |
| `loginform` anonymous screen DOM check | route owner / DOM parity | Keep the auth fallback boundary until the owner is separately verified. |

No observed failure names any of the ten retired selector strings, and those selectors have exact
source/React DOM absence proof. This batch removes no active selector module. Any unobserved tests
after harness detachment remain unclassified; a retained, complete global discovery is required
before any global retirement claim.
