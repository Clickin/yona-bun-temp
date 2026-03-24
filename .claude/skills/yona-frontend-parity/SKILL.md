---
name: yona-frontend-parity
description: Enforce yona-original frontend parity for this repository. Use this skill whenever editing any `apps/app` screen, layout, route, shell, UI copy, styling, or frontend component. Always preserve yona-original layout, UI wording, and template structure by default, and always make the implementation i18n-aware from the start.
---

# Yona Frontend Parity

This repository does not want freeform redesigns. Frontend work in `apps/app` should reproduce `yona-original` behavior and presentation as closely as current data/runtime constraints allow.

## Use this skill when

- touching any file under `apps/app/src/routes`
- changing shared UI shells or layout components
- editing frontend copy, labels, buttons, headings, placeholders, or empty states
- porting a legacy Play template into React
- changing colors, branding, spacing, menus, or page structure

## Core rules

1. Start from `yona-original` first. Identify the matching legacy template, menu, and message keys before changing the React screen.
2. Preserve layout and information architecture. Keep region order, menu placement, section grouping, primary actions, and permission-driven visibility aligned with the legacy screen.
3. Preserve UI wording. Prefer `yona-original/conf/messages` and `yona-original/conf/messages.ko-KR` wording over newly invented copy.
4. Use i18n from the start. Do not add new hardcoded user-facing strings directly in route components when they can live in `@yona/i18n` catalogs and app translator hooks.
5. Translate templates into reusable React pieces. It is acceptable to port legacy template HTML closely, but the end state should be reusable shell/section/form/menu components, not one-off JSX dumps.
6. Keep branding deltas narrow. Logo, color scheme, and design tokens may change. Layout, copy, and interaction structure should not drift unless the deviation is explicit and documented.

## Required workflow

1. Read the matching legacy template under `yona-original/app/views/**`.
2. Read the matching legacy message keys under `yona-original/conf/messages*`.
3. Check existing shared shells/components in `apps/app/src/components` before adding new markup.
4. If new user-facing copy is needed, add it through `packages/i18n` and `apps/app/src/lib/i18n-react.ts` consumption, not as route-local literals.
5. Verify with diagnostics, relevant tests, build, and runnable QA for public pages when possible.

## Preferred ownership

- catalogs and locale helpers: `packages/i18n`
- React i18n provider/hooks for the app runtime: `apps/app/src/lib/i18n-react.ts`
- shared parity shells: `apps/app/src/components/parity-shells.tsx`

## Avoid

- explanatory migration prose in user-visible UI
- replacing legacy labels with modernized synonyms without evidence
- moving menus or actions for aesthetic reasons
- creating bespoke per-screen wrappers when an existing shell or section component can absorb the template structure
