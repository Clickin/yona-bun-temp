---
name: yona-frontend-parity
description: Enforce yona-original parity when editing frontend screens, routes, shells, UI copy, styling, or components. Preserve legacy layout, wording, and behavior with React-owned interactions and existing i18n.
---

# Yona Frontend Parity

Frontend work in `frontend/` reproduces `yona-original` behavior and presentation. `AGENTS.md` owns runtime and parity policy.

## Use this skill when

- touching any file under `frontend/src/routes`
- changing shared UI shells or layout components
- editing frontend copy, labels, buttons, headings, placeholders, or empty states
- porting a legacy Play template into React
- changing colors, branding, spacing, menus, or page structure

## Core rules

1. Start from `yona-original` first. Identify the matching legacy template, menu, and message keys before changing the React screen.
2. Preserve layout and information architecture. Keep region order, menu placement, section grouping, primary actions, and permission-driven visibility aligned with the legacy screen.
3. Preserve UI wording. Prefer `yona-original/conf/messages` and `yona-original/conf/messages.ko-KR` wording over newly invented copy.
4. Use the existing catalogs under `frontend/src/i18n/` and hooks in `frontend/src/i18n.tsx`; keep user-facing copy out of route-local literals.
5. Translate legacy output DOM/UX into React state/events/components and TanStack Router/Query. Reuse existing components where appropriate; add no speculative abstractions.
6. Preserve frozen legacy CSS values. Only explicitly approved product-identity deviations in provenance may differ; this skill does not authorize new branding or design changes.

## Required workflow

1. Read the matching legacy template under `yona-original/app/views/**`.
2. Read the matching legacy message keys under `yona-original/conf/messages*`.
3. Check existing shared shells/components in `frontend/src/components` before adding new markup.
4. If user-facing copy is needed, use `frontend/src/i18n/` and `frontend/src/i18n.tsx`, preserving the legacy message keys.
5. Verify with repository diagnostics, relevant tests, build, and runnable QA for
   public pages when possible. Keep repository browser specs on the existing WTR
   Playwright-compatible `Page`/`Locator`/`Route` facade in
   `frontend/tests/wtr-compat.ts`, and use Astra's `browser.open` tab helpers
   or `tab.run` for ad-hoc browser inspection. Before commands that require an
   outside-sandbox run, inspect the process environment for an active sandbox
   marker, if one is provided. Astra has no `require_escalated` argument, so
   never invent one or clear a marker. If no approved outside-sandbox path is
   available, report the capability gate instead of bypassing it. Keep the
   repository's pnpm central-store and cargo wrapper rules from `AGENTS.md`.

## Preferred ownership

- catalogs: `frontend/src/i18n/`
- React i18n provider/hooks: `frontend/src/i18n.tsx`
- shared UI: `frontend/src/components/`; route shells: `frontend/src/routes/`

## Avoid

- explanatory migration prose in user-visible UI
- replacing legacy labels with modernized synonyms without evidence
- moving menus or actions for aesthetic reasons
- creating bespoke per-screen wrappers when an existing shell or section component can absorb the template structure
