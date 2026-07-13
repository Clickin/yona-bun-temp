# Frontend Yoram Rebrand

Status: active intentional deviation
Date: 2026-07-13

## Approved identity

- Display name: `Yoram`
- Footer attribution shown in the product UI: `Yoram authors`
- Default developer-contact repository: not rendered until a real public Yoram repository exists
- Korean and English product-name spelling: `Yoram`
- Release assets: Yoram-owned assets only; upstream Yona/NAVER artwork is not reused

## Legacy evidence and deviation

Legacy `yona-original/app/views/common/footer.scala.html`, `layout.scala.html`,
`siteLayout.scala.html`, `common/navbar.scala.html`, and their route-specific
includes render Yona, NAVER Corp., NAVER LABS, NAVER CLOUD PLATFORM, upstream
author, and upstream feedback links. The React implementation deliberately
replaces those product-facing identities with Yoram while preserving the same
workflow, route semantics, element roles, and frozen styling baseline.

This is not a legacy-copy parity claim. It is an approved product identity
deviation required because Yoram is an independent Apache-2.0 reimplementation,
not a NAVER-developed product or a Yona-branded fork.

## Compatibility boundaries retained

The following names are not product branding and must remain until separately
migrated with compatibility aliases:

- `YONA_*` and `VITE_YONA_*` deployment/configuration variables
- REST payload, database, migration/import/export, and legacy-data identifiers
- legacy URL/deep-link paths
- legacy CSS selectors, `yobicon-*` icon-font classes, and legacy message keys
- tests and documentation that explicitly identify upstream Yona behavior or data

README and NOTICE retain the Apache License 2.0 upstream disclaimer and NAVER/
Yona attribution outside the product-facing UI.

## Verification evidence

Phase 2 is complete only when the frontend inventory has no unapproved
user-facing Yona/NAVER identity, focused Korean desktop/mobile E2E and screenshot
baselines are updated deliberately, `pnpm --dir frontend check` and production
build pass, and legal/upstream notices remain present. Phase 3 StyleX work is a
separate commit and cannot rewrite the frozen legacy LESS/Bootstrap sources.

The full-stack integration restored all eight Rust crates and `cargo check
--workspace` passes. The four focused Playwright files start the real Rust
backend and pass 46/75 cases; the remaining 29 expose pre-existing Router-lineage
parity regressions (default `/projects?filter=&labelIds=` serialization,
active-link attributes, and focus/navigation timing) rather than missing backend
or rebrand runtime failures. These remain an explicit Phase 2 verification gap.
