---
children_hash: 7dd477f55f7c4624e3bc699d6510ffb3dff1968d9a92da300c3f6c09b95b3ca1
compression_ratio: 0.49923076923076926
condensation_order: 1
covers: [context.md, public_projects_directory_parity.md]
covers_token_total: 1300
summary_level: d1
token_count: 649
type: summary
---
# Structural Summary: public_projects

- **Topic Overview (`context.md`)**
  - Central focus: how the `/projects` directory loader composes contracts, DB aggregation, domain services, and UI rendering into a parity experience that merges visible and redacted cards.
  - Key pillars to explore: union schema, DB normalization/enrichment, authorization-driven redaction, and the ProjectDirectoryPage rendering/search/testing surface.

- **Parity Experience Details (`public_projects_directory_parity.md`)**
  - **Raw Concept**
    - Task: Document end-to-end parity across contracts, DB, domain services, and UI to consistently deliver visible and redacted project cards.
    - Flow: Loader validates filters/labelIds → `packages/domain/src/project-service.ts:listProjects` → DB summary/count/origin enrichment (`packages/db/src/org-project.ts`) → normalization into visible/redacted contract shapes (`packages/contracts/src/project.ts`) → UI renders ContentCards + tests verify both states.
    - Files referenced for tracing: contracts, DB org-project utilities, domain service, route renderer, and spec.
    - Timestamped 2026-04-05 by Project Directory Team.
    - Pattern: Enforces project names matching `^[a-zA-Z0-9-_.가-힣]+$`.

  - **Narrative Structure**
    - Contracts define discriminated schemas and normalization helpers for visible/redacted list items; DB layer normalizes IDs, counts members/watchers, and links origins; domain service wires authorization to build details and list items; UI loader renders cards (badges, counts, placeholders) and is covered by `_app.projects.index` spec.
  - **Dependencies**
    - ListProjects relies on authorization helpers, actor utilities, normalization, and project/membership DB interfaces; loader depends on schema validation, React router loader hooks, I18nProvider, and mocked Link utilities in spec.
  - **Highlights**
    - Visible cards show owner/date, label badges (tied to labelIds filters), scope badges, and member/watcher counts; redacted rows keep scope label and placeholder text; loader trims search input and enforces label filtering.
  - **Rules**
    - Project names validated by regex `^[a-zA-Z0-9-_.가-힣]+$`.
    - Reserved names `".", "..", ".git"` forbidden.

  - **Facts**
    - Visible cards surface member/watcher counts, label badges, and origin links plus label filtering.
    - Unauthorized projects render as redacted placeholders.
    - Project naming conventions enforced via regex and reserved names.
    - UI shows scope/label badges and member/watcher counts for public projects, linking badges to filters.