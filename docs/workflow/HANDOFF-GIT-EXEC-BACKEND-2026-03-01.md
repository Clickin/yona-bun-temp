# Git Executable Backend Handoff (2026-03-01)

## Context

- Branch: `git-exec-backend`
- Worktree: `worktrees/git-exec-backend`
- Goal: Replace `libgit2` FFI path with git executable architecture for Yona-style self-hosted Git operations.

## Implemented Checkpoint

### Core Git Server Layer

- Added executable Git adapter (`runGit`) with safe subprocess options and timeouts.
- Added repository path hardening under `YONA_DATA/repo/<repo_id>`.
- Added bare repository provisioning API/service.
- Added smart-http transport adapter around `git http-backend`.

### Mutation Layer (Inline Edit)

- Added application-level inline edit mutation flow using git plumbing:
  - `read-tree` -> `hash-object` -> `update-index` -> `write-tree` -> `commit-tree` -> `update-ref`
- Added optimistic concurrency using `baseOid`.
- Added protected branch policy checks.
- Added per-repository write lock serialization.
- Added audit logging for commit and conflict actions.

### Route Endpoints

- `POST /api/repos/[repoId]/bootstrap`
- `GET /api/repos/[repoId]/files?branch=...&path=...`
- `POST /api/repos/[repoId]/inline-edit`
- `GET/POST /api/repos/[repoId]/smart-http/[...gitPath]`

### Policy & Security

- Role-aware branch write policy (`admin`, `maintainer`, `developer`, configurable by env).
- Receive-pack authorization required for push transport paths.
- Invalid path/id errors mapped to 400, missing resources to 404, stale base to 409.
- Audit log rotation implemented with max size and max file count controls.

## Test Coverage Snapshot

- Added and passing Vitest coverage for:
  - parser/env/auth logic (`http-backend.spec.ts`, `auth.spec.ts`)
  - policy matrix (`policy.spec.ts`)
  - audit rotation (`audit.spec.ts`)
  - locking and mutation (`locks.spec.ts`, `mutation.spec.ts`)
  - provisioning (`provision.spec.ts`)
  - route behavior (`routes/*.spec.ts`)
- Yona Java test intent mirrored in key paths (Git repository creation, sequential commit behavior, branch protection/conflict semantics).

## Last Verified Commands

Run in `worktrees/git-exec-backend`:

```bash
bun run test:unit -- --run
bun run check
bun run build
```

All commands passed at checkpoint creation.

## Planned Next Session (E2E Focus)

1. **Smart HTTP end-to-end transport test**
   - Bootstrap a bare repo via API.
   - Use real Git client flow for `info/refs`, fetch, and receive-pack where authorized.
   - Verify auth-denied push paths return expected status.

2. **Inline edit end-to-end API flow**
   - Read file endpoint -> mutate with valid `baseOid` -> verify branch head and file content.
   - Submit stale `baseOid` -> verify 409 with expected/actual oid payload.

3. **Branch policy E2E matrix**
   - Validate `admin`, `maintainer`, `developer`, `reporter` behavior on protected vs unprotected branches.

4. **Audit verification**
   - Validate line-by-line JSONL records for successful commit and conflict paths.
   - Validate rotation rollover behavior under constrained limits.

## Operational Notes

- Keep using `bun` for install/run/test/check/build.
- Keep route tests outside `src/routes/**/+*.spec.ts` because SvelteKit reserves `+` prefixed files.
- Continue to mirror Yona Java test intent for behavior parity before expanding API surface.
