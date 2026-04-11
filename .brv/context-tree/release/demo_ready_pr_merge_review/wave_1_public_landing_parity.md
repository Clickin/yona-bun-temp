---
title: Wave 1 Public Landing Parity
tags: []
related: [release/demo_ready_pr_merge_review/landing_plan_2026_04_05_demo_ready_pr_merge_review.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T09:28:08.457Z'
updatedAt: '2026-04-05T09:28:08.457Z'
---
## Raw Concept
**Task:**
Document the Wave 1 public landing and navigation parity updates that align the anonymous introduction and layout with legacy Yona expectations under the demo-ready PR merge review.

**Changes:**
- Aligned the anonymous landing hero, CTA, feature grid, and legacy tagline with historical intro content while stripping temporary workstream and surface cards.
- Defined a parity spec that mandates legacy intro copy plus login/register/project/org/search nav links and forbids temporary labels, and wired _app.index.tsx to respect anonymous-only landing while redirecting authenticated users.
- Confirmed layout behavior via _app.tsx (nav links, search form scope=global/pageSize=20, en/ko-KR locale switcher, translation-backed footer/runtime info) and solidified the parity test spec that asserts legacy tagline plus essential actions without temporary descriptors.
- Recorded the audit baseline in docs/provenance/core-parity-audit.md that lists statuses, capability drift types, required tests, owners, and the passing Wave 0 exit snapshot commands.

**Files:**
- apps/app/src/routes/_app.index.tsx
- apps/app/src/routes/_app.tsx
- apps/app/src/routes/-public-landing-parity.spec.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Specify legacy intro copy and nav expectations -> enforce anonymous-only landing route and layout behaviors -> run legacy-parity spec tests -> capture status in parity audit baseline.

**Timestamp:** 2026-04-05

**Author:** Demo Ready PR Parity Team

## Narrative
### Structure
The release includes a Wave 1 public landing parity spec that drives _app.index.tsx anonymous routing, the home hero CTA/feature list rendered with translation keys, and the _app.tsx layout that exposes project/org/search navigation, authenticated workspace links, and locale controls tied to buildLocaleHref.

### Dependencies
Relies on useSuspenseQuery to surface the current session, useI18n for translations, and buildLocaleHref to compute en/ko-KR locale hrefs while keeping runtime info in the footer driven by translations.

### Highlights
Anonymous home now matches legacy intro content; search remains scoped globally with pageSize=20; locale switcher limited to en and ko-KR; parity spec test ensures essential links exist and temporary text is absent; audit documentation captures parity status and required tests for remediation readiness.

### Rules
Rule: Legacy nav must include login, register, projects, organizations, and search links and explicitly must not show “Primary Entry Points,” “Current Surface,” legacy feature description, or a “Home” link on the anonymous landing.

### Examples
Example parity assertion: landing HTML must contain legacy tagline and CTA to /register while lacking any temporary workstream or Current Surface language, as verified by -public-landing-parity.spec.tsx.

## Facts
- **public_landing_style**: Wave 1 public landing is unified with legacy intro-style content by retaining the legacy heading/tagline, feature grid, and removing temporary workstream/current-surface cards. [project]
- **parity_spec**: The anonymous parity spec enforces legacy intro copy, global nav links (login, register, projects, orgs, search), and forbids temporary labels such as "Primary Entry Points", "Current Surface", legacy feature description, and the legacy “Home” link. [project]
- **home_route_behavior**: apps/app/src/routes/_app.index.tsx now routes authenticated users away via resolveAuthenticatedHomePath and renders a HomeRouteComponent with hero CTA linking to /register alongside translated public entry links and feature list items (unlimitedProjects, codeManagement, issueTracker, privateProject, codeReview, workTeam). [project]
- **app_layout_behaviors**: apps/app/src/routes/_app.tsx renders a navbar with project/org/search links, shows workspace links only for authenticated users, includes a search form that submits scope=global and pageSize=20, provides en and ko-KR locale switcher via buildLocaleHref, and surfaces runtime info via translations while relying on useSuspenseQuery for session and useI18n for locale/text. [project]
- **public_landing_tests**: apps/app/src/routes/-public-landing-parity.spec.tsx mocks anonymous auth/locale/shell data, mounts the router at /, and asserts the legacy tagline and entry links are present while temporary workstream/current-surface copy is absent. [project]
- **parity_audit_status**: docs/provenance/core-parity-audit.md captures the Wave 0 audit vocabulary (parity, ux-drift, semantic-drift, missing, deferred-2nd-priority), the capability matrix, and marks the baseline as ready for remediation once bun run verify:agents, bun run check, and bun run test:unit are green. [project]
