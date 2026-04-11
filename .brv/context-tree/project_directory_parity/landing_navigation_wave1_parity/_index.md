---
children_hash: 5e7e2d38e2cbfd4dea27f749a1b6193234c13b76fe85c371b73ac1c4cd37bc4d
compression_ratio: 0.3246753246753247
condensation_order: 1
covers: [landing_navigation_wave_1_parity.md]
covers_token_total: 1155
summary_level: d1
token_count: 375
type: summary
---
## Landing Navigation Wave 1 Parity (landing_navigation_wave_1_parity.md)
- **Scope & Task**: Capture Wave 1 landing/navigation parity refinements for the public-facing app experience plus the supporting Wave 0 parity audit baseline (docs/provenance/core-parity-audit.md).
- **Flow**: Define parity spec → enforce anonymous-only landing route/layout → validate with `-public-landing-parity.spec.tsx` → document baseline audit.
- **Layout & Routing**: `_app.tsx` delivers project/org/search links, a global `/search` form (scope=global, pageSize=20), locale switcher (en/ko-KR), and runtime footer; `_app.index.tsx` renders anonymous-only hero (register CTA, translated feature list) and redirects authenticated users via `resolveAuthenticatedHomePath`, showing workspace/settings/new project links only when signed in.
- **Parity Rules & Tests**: Anonymous parity spec mandates legacy intro copy plus login/register/project/org/search links while forbidding temporary “Primary Entry Points”, “Current Surface”, legacy feature descriptions, and the Home link; `-public-landing-parity.spec.tsx` mocks auth/locale/shell data to verify compliance.
- **Audit Baseline**: `docs/provenance/core-parity-audit.md` records Wave 0 parity baseline, including status vocabulary (`parity`, `ux-drift`, `semantic-drift`, `missing`, `deferred-2nd-priority`), capability matrix, and successful verification commands (`bun run verify:agents`, `bun run check`, `bun run test:unit`), anchoring ongoing parity tracking.