# Domain: project_management

## Purpose
House knowledge about the public-facing project directory and how backend services, schemas, and UI components align to render consistent cards across visibility scopes.

## Scope
Included in this domain:
- Schema definitions for project list payloads
- ProjectService logic for list/load/update operations that feed the UI directory
- DB helpers and aggregations that supply member/watcher counts, labels, and origin project links
- Route-level components, loaders, and tests under apps/app/src/routes/_app.projects.index.tsx

Excluded from this domain:
- Project creation or editing flows that do not impact the public listing view
- Internal-only admin dashboards unrelated to the public /projects experience

## Ownership
Projects feature team

## Usage
Use this domain for describing the end-to-end project directory behavior from schema through to UI rendering and placeholder handling.
