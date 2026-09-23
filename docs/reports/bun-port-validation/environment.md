# Bun backend validation environment

Status: experiment implementation complete; locally runnable checks recorded; unavailable Docker and long-run checks remain explicitly blocked/pending.

## Checkout and scope

- Source checkout: `agent/current-main-wtr-acceptance`, `dffc73e4703dde3d9e54cc3496f8c6e3dafc5245`.
- Source worktree was clean at start; no user WIP was copied or changed.
- Chosen baseline: local `main` / `origin/main`, `420e9dfc4ea7e2fbd22320c221d3927f614f4e34`.
- Experiment: `experiment/bun-backend-validation`, worktree `../yoram-bun-validation`, based directly on `main`.
- This is noncanonical feasibility code. Rust and React remain the product runtime; no parity or release conclusion follows from a passing spike.
- Backend API selection: tRPC Fetch adapter + SuperJSON is the only backend API framework. TanStack Start remains the web shell; its route APIs intentionally import `@tanstack/react-router` because Start is powered by Router.
- SSH server interfaces are explicitly out of scope per user correction. Bun issue #11947 is closed as a duplicate of #4290; #4290 remained open when checked on 2026-09-23. No `ssh2`/`node-ssh` dependency or SSH server claim is permitted until Bun support is verified in a future run.

## Runtime and toolchain

- Bun latest stable at run start: `1.4.2`, official tag `bun-v1.4.2`, revision `744846f844374847c902b5e7fd59b4342a51ef99`.
- Official macOS ARM64 asset SHA-256: `90987a3a16d7db556d886ac3d551e7b6d3edf0a1cf43acaed622e8676be1d12f`; download checksum verified.
- Pinned binary executed: `1.4.2+744846f84` from `/tmp/yoram-bun-1.4.2/bun-darwin-aarch64/bun`.
- Host: macOS 25.5.0, Darwin arm64, Apple M4.
- Git `2.39.5`; SVN client and `svnserve` `1.14.5`; OpenSSH `10.2p1` (no SSH server implementation in this experiment).
- pnpm `10.32.1`; Cargo `1.98.1`.
- Docker CLI/server `29.4.0`; active Docker context `orbstack`, server Linux/aarch64. The daemon already contains unrelated active containers; validation must use newly named, disposable resources only and must not inspect or mutate existing project data.
- `nginx` is not installed on the macOS host; Docker packaging may supply it in the experiment image.
- No active `CODEX_SANDBOX` marker was present when checked.

## Package and database constraints

- SQLBraid runtime packages are pinned to exact `1.0.0`; no native database driver may be added to the Bun application path.
- SQLBraid 1.0.2 is a later separate checklist/retest, not a wait condition or automatic upgrade.
- Existing root `pnpm-lock.yaml` remains the product workspace lockfile. The experiment owns its own package manifest and Bun lockfile under `experiments/bun-port/`.
- DB fixtures: synthetic contract tests used temporary SQLite files; SQLBraid SQLite differential harness used a fresh temporary file and native `sqlite3` readback.
- PostgreSQL/MySQL/MariaDB container checks: `BLOCKED/NOT_RUN`; the only available Docker context is not authorized as a disposable test daemon.
- Image digests and Docker-packaged runtime versions: `BLOCKED/NOT_RUN` until a dedicated disposable Docker context is supplied.

## Baseline commands

- `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store test:dev-scripts` — completed before experiment edits; 304 passed, 1 failed. Existing failure: `scripts/css-cascade.spec.mjs`, head-vs-baseline semantic cascade reports 11 differences (9095 vs 9209 rules). Full raw output remains in the tool run artifact, not committed.
- `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test` — completed before experiment edits; 190 files and 263 tests passed. happy-dom emitted aborted network/iframe diagnostics during teardown, but the suite exited successfully.
- `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store agent:cargo-test -- --outside-sandbox -p yoram-vcs --test vcs` — passed in 38.2s. Full output remains in ignored `.agent/cargo-test-logs/cargo-test-2026-09-23T081815-179Z.log`; it is not a commit input.
