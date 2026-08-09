---
title: WTR-637 sweep protocol
kind: protocol
status: active
updated: 2026-08-09
---

# Sweep protocol

## Start

1. Read `[[index]]`, `[[overview]]`, and `[[stylex-fallback-baseline]]`.
2. Check the current branch and last relevant commit.
3. Pick one route/screen row from `[[route-parity-map]]`.
4. Read the cited Scala/partial, frozen LESS/Bootstrap/plugin CSS, current
   StyleX owner, focused WTR, and provenance row only.

## Implement

- Preserve legacy element type, order, copy, and user-visible behavior.
- Translate legacy JS/plugin behavior to React state/events and TanStack
  Router/Query; do not copy jQuery or inline DOM control code.
- Use the existing StyleX owner or add the smallest route-local owner.
- Keep legacy classes only when they are part of the visible legacy contract or
  still serve a documented sibling consumer.
- Do not add unexplained route-specific geometry compensation.

## Verify

For each active wave, run the focused fallback-off profile with Chrome at the
desktop and 390px viewports, covering DOM identity, computed CSS/geometry,
overflow, and one relevant interaction. Use the full profile only for final
visual lock.

Required final checks:

- TypeScript check and Vitest;
- production build and StyleX verifier;
- Scala HTML/source audit;
- full fallback-off WTR;
- `stylex-final` profile;
- F7 residual count is zero;
- `app.css` has no app-owned selectors before `global.css` replacement.

## Failure taxonomy

- `F1`: harness defect fixed;
- `F2`: harness or test-environment investigation;
- `F5`: distribution/fixture geometry is stale;
- `F6`: stale assertion or retained legacy class requires reconciliation;
- `F7`: genuine app parity gap requiring route implementation;
- `F8`: mirror/live instance unavailable;
- `F9`: flaky or timeout, rerun before classifying.

Every failure must retain its evidence and disposition in provenance. Never
turn unavailable measurements into a pass.
