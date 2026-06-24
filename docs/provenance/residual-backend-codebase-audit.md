# Residual Backend Codebase Audit

Status: current audit
Date: 2026-06-24

## Result

The current canonical runtime backend is Rust only:

- `crates/server`
- `crates/domain`
- `crates/persistence`
- `crates/migration`
- `crates/vcs`
- `crates/search`
- `crates/integrations`

No active Bun backend, Node application backend, or Go backend is present in
the repo root runtime surface.

## Evidence

- Root `package.json` exposes Node scripts for tooling, smoke tests,
  Playwright orchestration, and cargo wrappers only. These scripts start the
  Rust backend through `cargo run -p yona-rust-pilot-server` or build/smoke the
  Rust binary and Docker image.
- `scripts/dev-backend.mjs` uses `cargo watch` and delegates to
  `scripts/run-dev-backend-once.mjs`; that script writes dev config and runs
  `cargo run -p yona-rust-pilot-server`.
- Root non-reference `package.json` files are only `package.json` and
  `frontend/package.json`; `frontend/node_modules/.vite/deps/package.json` is
  generated dependency cache and ignored for ownership.
- No non-reference `*.go`, `go.mod`, or `go.sum` files were found when
  excluding `node_modules`, `target`, `yona-original`, and
  `reference/mixed-code`.

## Residual Reference Material

The only residual Bun/Node backend-style code lives under
`reference/mixed-code/**`, which `AGENTS.md`, `docs/agents/03-repo-structure.md`,
and `docs/agents/04-architecture-guardrails.md` classify as reference-only:

- `reference/mixed-code/root-toolchain/package.json` and `bun.lock`
- `reference/mixed-code/apps/app/package.json`
- `reference/mixed-code/apps/app/src/server.ts`
- `reference/mixed-code/packages/*/package.json`
- `reference/mixed-code/tests/*bun*` and hybrid testcontainer scripts
- `reference/mixed-code/tools/bun-package/package.json`

That material includes the old Bun/TanStack Start/tRPC/Drizzle direction and
must not be described as current runtime baseline or used for new application
endpoints.

## Release Decision

- Keep `reference/mixed-code/**` for historical migration evidence only.
- Do not publish `reference/mixed-code/**` as part of release artifacts, Docker
  images, or user-facing docs.
- Do not revive Bun, TanStack Start, in-process tRPC, Go backend, `connect-go`,
  `chi`, or `uptrace/bun` as RC implementation choices.
- Keep Node scripts as repo tooling; they are not a backend runtime.
