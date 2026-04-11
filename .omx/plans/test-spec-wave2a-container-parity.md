# Test Spec: Wave 2A Container Parity

## Shared Prep Proof

- `pnpm --dir frontend install`
- `pnpm --dir frontend check`
- `pnpm --dir frontend test`
- `cargo test --manifest-path Cargo.toml -p yona-rust-pilot-server --test auth_workspace_contract`
- `cargo test --manifest-path Cargo.toml -p yona-rust-pilot-server --test router_contract --test db_router_contract`

## Contract / Backend Red-Green Targets

- `crates/server/tests/org_project_contract.rs`
  - add failing contract tests for `ReadOrganizationContainer`
  - add failing contract tests for `ReadProjectContainer`
  - add failing contract tests for `UpdateProjectOverview`
  - add failing contract tests for `ToggleProjectWatch`
- `crates/domain/tests/org_project_contract.rs`
  - add ACL-focused tests when new gating helpers are introduced for container visibility
- `crates/persistence/tests/org_project_repo_contract.rs`
  - add repo-level coverage for visible project cards, member summaries, watcher state, menu counts, and milestone summary inputs when new helpers are introduced

Required behaviors:
- organization container covers project cards, admin/member rosters, and create/settings gates
- project container covers header/meta, menu flags/counts, member summary, current milestone summary, clone shell, and default tab
- `UpdateProjectOverview` only changes overview data and returns refreshed container state
- `ToggleProjectWatch` updates watch state and count consistently

## Frontend Red-Green Targets

- `frontend/src/*wave2a*.spec.tsx` or equivalent route parity specs

Required behaviors:
- organization home renders hero, filter bar, gated create CTA, visible project cards, side rosters, and settings entry
- project home renders header, menu counts, clone block, overview shell, placeholder tab chrome, member summary, milestone block, and gated actions
- project settings shell renders menu toggles and overview controls from the new container view model
- organization/project home routes read only the new container RPCs

## Final Regression Suite

- `pnpm --dir frontend check`
- `pnpm --dir frontend test`
- `pnpm --dir frontend build`
- `pnpm --dir frontend test:e2e`
- `cargo test --manifest-path Cargo.toml --workspace -- --skip testcontainers_db_matrix_smokes_runtime_migration_and_repository_flow`

## Explicit Gaps To Preserve

- downstream `/organizations/:org/issues|boards|pullrequests`
- downstream `/:owner/:project/issues|posts|pullRequests|code`
- real README/history/dashboard data loading
- Wave 1 provenance row wording re-audit
