---
title: Yoram migration wiki index
kind: index
status: active
updated: 2026-08-09
---

# Yoram migration wiki

Start here for a focused sweep. The repository rules and legacy evidence remain
authoritative; this index only points to the smallest useful reading set.

## Working pages

- [[purpose]] — why this knowledge layer exists.
- [[overview]] — current migration and verification snapshot.
- [[stylex-fallback-baseline]] — `app.css`, generated fallback, Select2, and
  final `global.css` exit conditions.
- [[route-parity-map]] — representative route → legacy → StyleX → WTR →
  provenance links.
- [[sweep-protocol]] — repeatable per-wave procedure and failure taxonomy.
- [[log]] — append-only decisions, measurements, and commits.

## Canonical sources

- [AGENTS.md](../../AGENTS.md) — conversion principles and execution rules.
- [SPEC.md](../../SPEC.md) — fixed decisions, feature contracts, and DoD.
- [DESIGN.md](../../DESIGN.md) — frozen visual baseline.
- [StyleX best practices](../agents/11-stylex-best-practices.md) — authoring
  and verifier conventions.
- [WTR-637 ledger](../provenance/wtr-637-ledger.md) — failure families and
  dispositions.
- [StyleX migration ledger](../provenance/frontend-stylex-migration-ledger.md)
  — owner-level history.

## Current status

The StyleX migration is transitional. `frontend/src/app.css` is still imported
by `frontend/src/main.tsx`; fallback-off and final visual-lock work are not
complete. WTR now owns the browser runner through the system-Chrome launcher
and `tests/wtr-compat.ts`; legacy seeding, route discovery, and real-data
visual sweep use the same `scripts/wtr-browser.mjs` adapter. Do not rename `app.css` to
`global.css` until the exit conditions in [[stylex-fallback-baseline]] are
green.
