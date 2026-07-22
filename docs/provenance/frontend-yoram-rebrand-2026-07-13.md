# Frontend Yoram Rebrand

Status: Phase 2 complete; intentional identity deviation retained
Date: 2026-07-13

## Approved identity

The Yoram project owner explicitly made these footer/contact/repository changes;
they are not agent-inferred substitutions. This deviation was explicitly
requested and approved by the owner. It is not an implementation accident, an
unresolved parity gap, or an item to restore during screenshot-parity, Scala
HTML goal, or StyleX migration work.

- Display name: `Yoram`
- Footer attribution shown in the product UI: `Yoram authors`
- Default developer-contact repository: not rendered until a real public Yoram repository exists
- Korean and English product-name spelling: `Yoram`
- Release assets: Yoram-owned assets only; upstream Yona/NAVER artwork is not reused

In particular, footer or navigation entries for NAVER, NAVER LABS, NAVER CLOUD
PLATFORM, upstream Yona repository URLs, and the legacy developer-contact link
are intentionally absent or replaced by Yoram-owned copy. Future parity work
must preserve this decision. A diff containing those omissions/replacements is
therefore expected evidence of the approved Yoram deviation, not a failure to
copy `common/footer.scala.html`.

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

The approval includes visible layout consequences. In particular, a legacy
navbar screenshot may contain a configured developer-contact item before the
global search form. Yoram intentionally omits that item until a real public
repository is configured, so the search form starts earlier by the omitted
item's natural width. Screenshot parity must classify that position difference
as part of this identity deviation, not restore upstream copy/link targets or
introduce artificial spacing to imitate an absent item.

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

The frontend inventory has no unapproved user-facing Yona/NAVER identity,
focused Korean desktop/mobile E2E and screenshots were updated deliberately,
`pnpm --dir frontend check`, focused rebrand Vitest, and the production build
pass, and legal/upstream notices remain present. Phase 3 StyleX work remains a
separate commit and does not rewrite the frozen legacy LESS/Bootstrap sources.

The full-stack integration restored all eight Rust crates and `cargo check
--workspace` passes. The focused Playwright inventory starts the real Rust
backend. Identity-focused cases pass; nine older cases still expose independently
tracked DOM/Router baseline drift (form action base prefixes, tab element roles,
and stale fixture structure), not rebrand or backend runtime failures.

The empty Git/SVN repository instructions at `/admin/sample/code` now project
the configured runtime site name with the approved `Yoram` fallback. This keeps
the exact legacy `code/nohead.scala.html` and `code/nohead_svn.scala.html` DOM,
commands, route behavior, and frozen geometry while replacing the formerly
hardcoded user-visible `Yona` copy. The parent project shell now recognizes
Git, SVN, and SUBVERSION as supported VCS values for the exact `/code` root,
while retaining the Git-only pull-request and unsupported-VCS error branches.
Focused Git and SVN E2E cover English and Korean copy plus desktop and 390px
geometry.

Managed Rust backend + React Playwright screenshot baselines for the ko-KR
empty SVN state are stored at
`output/playwright/yoram-rebrand-code-nohead-ko-desktop.png` (1366x900,
SHA-256 `05e8084c8c87221330d4473cc4e7abccd5b4fb6b8d5111f89ba657dfe6631e75`)
and `output/playwright/yoram-rebrand-code-nohead-ko-mobile.png` (390x844,
SHA-256 `a3217204191a2204701744d2ef64044d5e27be8284f08bd190573b3e82399e39`).
The focused capture run passed 1/1; screenshot calls were temporary and are not
part of the E2E source.

The software-update screen keeps the legacy available-version and current-version
copy, but no longer invents a Yona GitHub release target when `releaseUrl` is
absent. Until a public Yoram repository exists, an available version without a
configured or discovered nonempty release URL renders no Download link. A real
configured or discovered release URL remains an unchanged external link.

The shared editor Markdown help retains the exact legacy feature order,
input/output examples, two-column structure, toggle interaction, local sample
image, and frozen geometry from `help/markdown.scala.html`. Product-facing
upstream examples (`yobi.io`, `repo.yona.io`, `demo.yobi.io`, `@yobi`, and
`Yobi` titles) are intentionally replaced by `example.com`, `@example`, and
neutral internal sample paths. No Yoram repository or developer-contact link is
invented before a public repository exists.

Phase 2 identity verification baselines now expect the approved `Yoram`
fallback in route metadata, public copy, password recovery highlights,
restricted/restart branding, and the plain `Yoram authors` footer. The password
recovery desktop title metric was re-recorded for the longer approved name;
mobile wrapping is unchanged. `/migration` intentionally retains its legacy
user-visible `Yona to Github` migration-tool label, and compatibility-only CSS,
route, environment, API, and test-description names remain unchanged.

The completion audit also covers Git identities produced by the backend VCS
layer. When no user author is supplied, README commits and server-created pull
request merge/preview commits use `Yoram <yoram@example.invalid>` rather than an
upstream product identity. Explicit user/configured authors are not rewritten.
