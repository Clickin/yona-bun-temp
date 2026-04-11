# Domain: project_directory_parity

## Purpose
Capture the /projects parity state across contracts, database records, domain services, UI, and audit findings for release planning.

## Scope
Included in this domain:
- Contract and schema rules that govern project metadata and list inputs/outputs
- Database helpers, CRUD flows, and authorization checks that power project summaries and member listings
- Domain services and UI routes composing the project directory experience and visible/redacted cards
- Audit matrices that track parity, semantic/UX drift, and outstanding gaps for public project features

Excluded from this domain:
- Non-/projects directories such as organizations or admin dashboards
- Legacy cards only relevant to deprecated interfaces

## Ownership
Release Engineering / Platform parity team

## Usage
Reference this domain when assessing /projects parity drift, planning remediation, or onboarding new contributors to the project directory track.
