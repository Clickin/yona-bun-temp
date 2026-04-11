# Domain: project_directory

## Purpose
Captures knowledge about the /projects directory listing parity logic across backend, domain, and UI layers.

## Scope
Included in this domain:
- Project schema definitions and normalization helpers for list inputs
- DB aggregation, counts, origin project linking, and CRUD helpers for projects and organizations
- Domain services that authorize access, produce visible/redacted responses, and expose listing/detail/member endpoints
- UI routing, loaders, and tests that render and verify visible and redacted project cards

Excluded from this domain:
- Other feature routes unrelated to /projects directory rendering

## Ownership
Project Directory Team

## Usage
Reference this domain for any investigation or enhancement touching the /projects directory experience.
