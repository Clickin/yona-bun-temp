# Buffa Removal — Frontend Migration

**Status**: resolved (2026-08-25)
**Goal**: Remove remaining `@bufbuild/protobuf` dependency and all `frontend/src/gen/` imports from the frontend.
**Prerequisite**: Rust-side `buffa` removal completed (see `proto_types.rs`).

## Resolution

- `frontend/src/api/types.ts` replaced the generated protobuf type imports.
- `frontend/src/auth-workspace-client.ts` uses plain JSON request objects.
- `frontend/src/gen/` is absent; no `pilot_pb` or `@bufbuild` references remain
  under `frontend/` or the workspace package manifests.
- `frontend/package.json` has no protobuf/buf generation dependencies or
  scripts.

The plan below is retained as historical provenance; it is not an open work
queue.

## Historical plan (closed)

### 1. `frontend/src/gen/yona/pilot/v1/pilot_pb.ts` (generated protobuf TS file)

This file is **gitignored** (`.gitignore: frontend/src/gen/`) but still exists on disk and is imported by 10+ frontend files. It must be replaced with hand-written TypeScript types and then deleted.

### 2. `@bufbuild/protobuf` npm dependency

Listed in `frontend/package.json`. Only used by `auth-workspace-client.ts` (imports `MessageInitShape`). Once that file is migrated, remove the dependency.

### 3. `frontend/src/auth-workspace-client.ts` (~1,860 lines)

This is the main API client. It uses `@bufbuild/protobuf` schema types (`*Schema`, `MessageInitShape`) to construct request payloads. It needs to be rewritten to use plain JSON objects instead.

The file is imported by ~50 route files:
```
frontend/src/app-view-models.ts
frontend/src/app-runtime-context.tsx
frontend/src/routes/.../*.tsx (40+ files)
```

## Strategy — Ponytail

**Do not rewrite `auth-workspace-client.ts` completely.** Instead:

### Step 1: Create `frontend/src/api/types.ts`

Create a single file with hand-written TypeScript type definitions for ALL types imported from `pilot_pb`. These are plain interfaces with `camelCase` fields matching the Rust `proto_types.rs` serde structs.

Types needed (27 total, used as `import type`):

```
EnrollmentMutationResult
ListOrganizationsResponse
ListProjectLabelCategoriesResponse
ListProjectLabelsResponse
ListProjectMilestonesResponse
ListProjectsResponse
OrganizationAdminView
OrganizationContainer
OrganizationDetail
OrganizationRedirectResult
ProjectLabelCategoryMutationResponse
ProjectLabelMutationResponse
ProjectMilestoneDeleteResponse
ProjectMilestoneMutationResponse
ReadAuthUiCapabilitiesResponse
ReadCurrentSessionResponse
ReadIssueDetailResponse
ReadOrganizationMembersResponse
ReadProjectMembersResponse
ReadWorkspaceOverviewResponse
RecordRecentProjectVisitResponse
ToggleFavoriteProjectResponse
VerifyUserResponse
WorkspaceIssueItem
WorkspaceMemberProjectItem
WorkspaceProfile
WorkspacePullRequestItem
```

Also any type referenced in `auth-workspace-client.ts` that's used as a type annotation.

### Step 2: Update type-only import files

Files that use these types ONLY as type annotations (`import type`):

```
frontend/src/api/session.ts         → ReadCurrentSessionResponse
frontend/src/api/issue-meta.ts      → ReadIssueDetailResponse
frontend/src/api/workspace.ts       → ReadCurrentSessionResponse, ReadWorkspaceOverviewResponse, RecordRecentProjectVisitResponse
frontend/src/api/org-project.ts     → 12 types
frontend/src/api/project-labels.ts  → 4 types
frontend/src/api/milestones.ts      → 3 types
frontend/src/api/users.ts           → 4 types
frontend/src/api/auth.ts            → 3 types
```

For each: change `import type { X } from "../gen/yona/pilot/v1/pilot_pb"`
to `import type { X } from "../api/types"`

### Step 3: Migrate `auth-workspace-client.ts`

This is the hard part. The file uses `*Schema` objects (e.g., `SignInWithPasswordRequestSchema`) with `MessageInitShape` to create typed request payloads.

**Lazy approach**: Each exported function in `auth-workspace-client.ts` calls `create(requestSchema, payload)` to build a request object, then presumably sends it via `fetch` or similar. 

1. Read the file to understand the exact pattern
2. Each `create(SchemaName, { fields })` call becomes `{ fields }` (plain object)
3. Each `import type { MessageInitShape }` gets replaced with `import type { ... } from "../api/types"`
4. The `*Schema` imports get deleted — they're construction templates, not type annotations
5. If the file uses `toJson()` or similar protobuf serialization → replace with `JSON.stringify()`

Look at how the returned values are consumed. If callers treat the result as a plain promise (`.then()` / `await`), no signature change is needed. If they call protobuf methods on the result, that's a bigger change.

### Step 4: Delete `frontend/src/gen/`

Once no file imports from `frontend/src/gen/`, delete the directory entirely.

### Step 5: Remove `@bufbuild/protobuf` from `frontend/package.json`

Also remove:
- `@bufbuild/buf`
- `@bufbuild/protoc-gen-es`

These are only needed for proto generation, which no longer exists (proto dir was deleted).

### Step 6: Remove any remaining proto-related build scripts

Check `frontend/package.json` scripts for `buf:generate`. Remove it.

## Verification

- `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend check`
  passes.
- Structural search finds no `pilot_pb`, `@bufbuild/protobuf`,
  `@bufbuild/buf`, or `protoc-gen-es` references in frontend sources or
  package manifests.

## Scope Boundaries

- Do NOT touch `frontend/src/routeTree.gen.ts` — that's TanStack Router generated, unrelated.
- Do NOT touch Rust `crates/server/src/lib.rs` compatibility shims. That's a separate cleanup.
- Do NOT change API contract — only change how requests are constructed (protobuf → plain JSON objects).