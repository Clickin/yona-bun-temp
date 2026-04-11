---
title: Public Projects Directory Parity
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T05:42:56.840Z'
updatedAt: '2026-04-05T05:42:56.840Z'
---
## Raw Concept
**Task:**
Document how the /projects directory parity experience composes contracts, DB aggregation, domain services, and UI rendering so that visible and redacted project cards are delivered consistently.

**Changes:**
- Captured the project list item union that augments visible cards with memberCount, watcherCount, labels, originProject, and labelIds filtering while substituting redacted placeholders for unauthorized projects.
- Outlined schema utilities in packages/contracts/src/project.ts, including normalization helpers and the projectName regex plus reserved names.
- Summarized packages/db/src/org-project.ts constants, interfaces, normalization utilities, and CRUD helpers that build project summaries, counts, labels, and origin metadata.
- Documented packages/domain/src/project-service.ts methods that authorize access, convert DB rows, and power create, read, list, settings, update, and member endpoints with redaction logic.
- Described apps/app/src/routes/_app.projects.index.tsx rendering of search, visible/redacted cards, badges, counts, and the companion spec in apps/app/src/project-directory-route.spec.tsx that asserts both visible and placeholder states.

**Files:**
- packages/contracts/src/project.ts
- packages/db/src/org-project.ts
- packages/domain/src/project-service.ts
- apps/app/src/routes/_app.projects.index.tsx
- apps/app/src/project-directory-route.spec.tsx

**Flow:**
The /_app/projects loader validates optional filter and labelIds inputs, calls packages/domain/src/project-service.ts listProjects, which normalizes identities, queries packages/db/src/org-project.ts for summaries, counts, and origin data, and converts rows into visible or redacted contracts before the UI renders ContentCards with badge links, counts, and placeholders while tests confirm both states.

**Timestamp:** 2026-04-05

**Author:** Project Directory Team

**Patterns:**
- `^[a-zA-Z0-9-_.가-힣]+$` - Allowed characters for projectName schema

## Narrative
### Structure
packages/contracts/src/project.ts defines normalization helpers and discriminated schemas for visible and redacted list items while packages/db/src/org-project.ts supplies constants, interfaces, and CRUD helpers that normalize identifiers, resolve memberships, and compute member/watcher counts plus origin project links. packages/domain/src/project-service.ts wires those helpers with authorization gates to build ProjectDetail, MemberDirectory, VisibleListItem, and RedactedListItem exports, and apps/app/src/routes/_app.projects.index.tsx consumes the listProjects loader to render ContentCards with search, badges, counts, placeholders, and a spec that mocks routing to assert both visible and hidden rows.

### Dependencies
ListProjects and related endpoints depend on authorization helpers, actor utilities, normalization helpers, and the DB interface for projects and memberships, while the UI loader depends on schema validation (filter, labelIds), react-router loader hooks, and I18nProvider plus mocked Link utilities in the spec.

### Highlights
Public cards show owner/date context, label badges that open labelIds filters, and badges for scope while member/watcher counts appear only for visible projects; redacted rows display the scope label and placeholder text; label filtering and search input trimming are baked into the loader; reserved project names (".", "..", ".git") and the projectName regex enforce naming rules.

### Rules
Rule: The projectName schema only accepts characters matching ^[a-zA-Z0-9-_.가-힣]+$
Rule: Reserved project names ".", "..", and ".git" may never be used

### Examples
The spec renders both a visible project card showing member/watcher counts and a redacted placeholder card ensuring both behaviors remain intact during regressions.

## Facts
- **visible_card_metadata**: Visible project cards surface memberCount, watcherCount, label badges, originProject links, and support labelIds filtering. [project]
- **redaction_policy**: Non-public projects without read permission are rendered as redacted placeholder rows in the project directory list. [project]
- **project_name_regex**: Project names must match the regex ^[a-zA-Z0-9-_.가-힣]+$. [convention]
- **reserved_project_names**: Reserved project names are ".", "..", and ".git". [convention]
- **ui_card_details**: ProjectDirectoryPage shows scope and label badges plus member/watcher counts for public projects and links label badges to labelIds filters. [project]
