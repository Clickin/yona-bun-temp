---
title: Landing Navigation Wave 1 Parity
tags: []
related: [project_directory_parity/projects_parity_baseline/context.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T09:27:12.745Z'
updatedAt: '2026-04-05T09:27:12.745Z'
---
## Raw Concept
**Task:**
Document Wave 1 landing and navigation parity refinements for the public-facing apps/app experience and supporting audit artifacts.

**Changes:**
- Aligned the public landing and global navigation with legacy intro-style copy while removing temporary workstream/current-surface cards.
- Enforced anonymous-only landing rendering with CTA to /register, public entry links, and translations-driven feature grid while redirecting authenticated visitors via resolveAuthenticatedHomePath.
- Captured the Wave 0 parity audit baseline in docs/provenance/core-parity-audit.md, including status vocabulary, capability matrix, and verification commands.

**Files:**
- apps/app/src/routes/_app.index.tsx
- apps/app/src/routes/_app.tsx
- apps/app/src/routes/-public-landing-parity.spec.tsx
- docs/provenance/core-parity-audit.md

**Flow:**
Parity spec definition -> anonymous-only route and layout rendering -> parity spec test validation -> audit baseline documentation

**Timestamp:** 2026-04-05

## Narrative
### Structure
The _app layout exposes project/org/search links in the navbar, a scoped search form targeting /search with scope=global and pageSize=20, a locale switcher covering en and ko-KR, and a footer presenting runtime data. Anonymous visitors are routed through _app.index.tsx, which renders the hero (register CTA, login/register/forgot/reset/project/org/search entry links) and a feature list assembled from translations (unlimitedProjects, codeManagement, issueTracker, privateProject, codeReview, workTeam). Authenticated visitors are redirected via resolveAuthenticatedHomePath, and workspace/settings/new project links appear only when signed in.

### Dependencies
Landing enforcement relies on resolveAuthenticatedHomePath for redirects, useSuspenseQuery for session data, useI18n for translation strings, and buildLocaleHref for locale toggles. Search form behavior and footer runtime snippets depend on translations and runtime payloads supplied by the layout shell components.

### Highlights
The anonymous parity spec guarantees the landing includes legacy intro copy, nav links for login/register/projects/orgs/search, and explicitly excludes temporary labels such as "Primary Entry Points", "Current Surface", legacy feature descriptions, and the Home link. The public-landing-parity.spec.tsx test suite mocks auth, locale, and shell data to verify the legacy tagline/links appear while temporary workstream/current-surface content is absent. docs/provenance/core-parity-audit.md captures the Wave 0 baseline, parity vocabulary, capability matrix, and successful verification commands (bun run verify:agents, bun run check, bun run test:unit) to support ongoing parity work.

## Facts
- **landing_content**: Wave 1 public landing page matches legacy intro-style content with legacy heading/tagline, a feature grid, and removal of temporary workstream/current-surface cards. [project]
- **nav_parity_spec**: Anonymous parity spec requires public navigation links (login, register, projects, orgs, search) while forbidding temporary labels such as "Primary Entry Points", "Current Surface", the legacy feature description, and the Home link. [convention]
- **landing_route_behavior**: apps/app/src/routes/_app.index.tsx enforces an anonymous-only landing by redirecting authenticated users via resolveAuthenticatedHomePath and rendering the hero with register CTA and translations-driven feature list. [project]
- **layout_behavior**: apps/app/src/routes/_app.tsx layout provides project/org/search nav links, shows workspace/settings/new project only to authenticated users, posts search form to /search with scope=global & pageSize=20, supports en and ko-KR locales, and surfaces runtime info in the footer. [project]
- **parity_tests**: apps/app/src/routes/-public-landing-parity.spec.tsx mocks authentication, locale, and shell data to assert the landing renders the legacy tagline and essential entry links while omitting temporary workstream/current-surface copy. [project]
- **core_parity_audit**: docs/provenance/core-parity-audit.md freezes the Wave 0 parity audit baseline for apps/app with a status vocabulary (parity, ux-drift, semantic-drift, missing, deferred-2nd-priority), a capability matrix, and an exit snapshot noting bun run verify:agents, bun run check, and bun run test:unit success. [project]
