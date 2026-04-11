# Fixture Strategy

## Goal

Translate `yona-original/conf/test-data.yml` into stable Rust and React test fixtures without leaking legacy numeric IDs into new tests.

## Canonical Fixture Names

Freeze these identifiers as the canonical parity fixture names:

- Users: `admin`, `yobi`, `laziel`, `doortts`, `nori`, `alecsiel`, `kjkmadness`
- Organizations: `labs`, `weblabs`
- Projects: `projectYobi`, `projectYobi-1`, `Jindo`, `CUBRID`, `HelloSocialApp`, `HelloSocialApp-1`, `TestApp`, `prj_test`

## Current Baseline And Canonical Target

- current mixed-code reference: root domain/db/frontend fixture helpers
- canonical implementation path: `repo root`
- canonical owner path:
  - `crates/domain`
  - `crates/persistence`
  - `frontend`

## Rules

- Prefer login IDs and public owner/project names in assertions.
- Preserve legacy display names and Korean overview text only where they carry provenance value.
- Build fixture factories in Rust domain/persistence layers first, then expose only the minimum UI-facing helpers needed by `frontend`.
