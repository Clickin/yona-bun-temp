---
title: LAN real-data visual smoke provenance
kind: provenance
status: active
updated: 2026-08-09
---

# LAN real-data visual smoke

## Runtime

- Browser runner: WTR's `@web/test-runner-chrome` system Chrome adapter in
  `scripts/wtr-browser.mjs`.
- App URL: `http://192.168.45.20:18101/yona/`.
- The exact base path without a trailing slash now returns `303 See Other` to
  `/yona/`; this prevents the legacy compatibility `POST /` route from
  returning `405 Method Not Allowed` to a browser GET.
- Database: existing Docker `yona-legacy-mariadb` on `127.0.0.1:33069`, using
  `YONA_SCHEMA_POLICY=validate_only`. No schema or application writes were
  requested by this smoke run.
- Read-only row-count evidence before launch: users `41`, projects `4`, issues
  `4,643`, posts `114`.

## Evidence

- `GET /yona` from the LAN address: `303`, `Location: /yona/`.
- `GET /yona/`: `200` HTML.
- `GET /yona/api/v1/projects`: `200`, JSON body `16,199` bytes.
- Focused real-data WTR sweep at desktop `1366x900` over `/`, `/projects`,
  `/admin/sample/issues`, and `/admin/sample/issue/1`: `4 passed / 0 failed`.
- The sweep was anonymous because no credentials were injected; its status is
  `AUTH_BLOCKED` and it is read-only smoke evidence, not authenticated parity
  completion evidence.

This evidence confirms LAN reachability, real-data boot, and the WTR browser
boundary. It does not close the StyleX final lock: F7 residuals, fallback
consumer retirement, and full fallback-off parity remain separate gates.
