import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

import {
  evaluateParityGate,
  formatParitySummary,
  shouldBlockForStrictGate,
} from "../tools/yona-parity-gate.mjs";

const TEST_REPO_ROOT = mkdtempSync(path.join(tmpdir(), "yona-parity-gate-"));
mkdirSync(path.join(TEST_REPO_ROOT, "yona-original"));

test.after(() => {
  rmSync(TEST_REPO_ROOT, { force: true, recursive: true });
});

const runGate = (changedFiles) =>
  evaluateParityGate({
    changedFiles,
    repoRoot: TEST_REPO_ROOT,
  });

test("passes when only documentation changes are present", () => {
  const result = runGate(["docs/agents/09-llm-onboarding-checklist.md"]);

  assert.equal(result.verdict, "pass");
  assert.equal(result.capabilities.length, 0);
  assert.match(result.summary, /No implementation files/);
});

test("ignores reference-only root mixed-code changes", () => {
  const result = runGate(["reference/mixed-code/packages/auth/src/app-service.ts"]);

  assert.equal(result.verdict, "pass");
  assert.equal(result.implementationFiles.length, 0);
  assert.match(result.summary, /No implementation files/);
});

test("ignores reference-only spikes archive changes", () => {
  const result = runGate(["reference/spikes/rust-foundation/prototype.rs"]);

  assert.equal(result.verdict, "pass");
  assert.equal(result.implementationFiles.length, 0);
  assert.match(result.summary, /No implementation files/);
});

test("ignores repo tooling and bootstrap files that do not define parity semantics", () => {
  const result = runGate([
    ".gitignore",
    ".husky/pre-commit",
    "DESIGN.md",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "frontend/package.json",
    "frontend/pnpm-lock.yaml",
    "frontend/index.html",
    "frontend/tsconfig.json",
    "frontend/vite.config.ts",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(result.implementationFiles.length, 0);
  assert.match(result.summary, /No implementation files/);
});

test("blocks parity-complete canonical route changes without accompanying parity evidence", () => {
  const result = runGate(["frontend/src/routes/projects/route.tsx"]);

  assert.equal(result.verdict, "block");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["public-project-directory"],
  );
});

test("passes parity-complete canonical route changes when a parity test changes alongside them", () => {
  const result = runGate([
    "frontend/src/routes/projects/route.tsx",
    "tests/yona-legacy-parity-gate.test.mjs",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
});

test("marks partial legacy slices as expected non-parity until audit evidence lands", () => {
  const result = runGate([
    "crates/server/src/session.rs",
    "crates/server/tests/auth_workspace_contract.rs",
  ]);

  assert.equal(result.verdict, "expected-nonparity");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.match(result.summary, /Auth and account lifecycle/);
});

test("passes partial legacy slices when tests and parity audit updates land together", () => {
  const result = runGate([
    "crates/server/src/session.rs",
    "crates/server/tests/auth_workspace_contract.rs",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
});

test("maps notification inbox frontend files to the issue notification slice", () => {
  const result = runGate([
    "frontend/src/api/notifications.ts",
    "frontend/src/routes/notification/route.tsx",
    "crates/server/tests/notification_contract.rs",
    "docs/provenance/phase-0b/issue.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.equal(
    result.unmappedImplementationFiles.includes("frontend/src/api/notifications.ts"),
    false,
  );
  assert.equal(
    result.unmappedImplementationFiles.includes("frontend/src/routes/notification/route.tsx"),
    false,
  );
});

test("passes notification route alias changes with route parity evidence", () => {
  const result = runGate([
    "frontend/src/routes/notification/route.tsx",
    "frontend/src/routes/notifications/route.tsx",
    "frontend/src/route-parity.spec.tsx",
    "docs/provenance/phase-0b/issue.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.equal(
    result.unmappedImplementationFiles.includes("frontend/src/routes/notifications/route.tsx"),
    false,
  );
});

test("maps shared frontend query keys to the API query boundary", () => {
  const result = runGate([
    "frontend/src/api/query-keys.ts",
    "frontend/src/api-query.spec.ts",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["frontend-api-query-boundary"],
  );
});

test("maps board posting frontend files before generic project routes", () => {
  const result = runGate([
    "frontend/src/api/boards.ts",
    "frontend/src/routes/-board-views.tsx",
    "frontend/src/routes/$owner/$projectName/posts/route.tsx",
    "frontend/src/routes/organizations/$organizationName/boards/route.tsx",
    "frontend/tests/board-posting-parity.e2e.ts",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["board-posting-core"],
  );
});

test("maps project scoped pull request routes before generic project routes", () => {
  const result = runGate([
    "frontend/src/routes/$owner/$projectName/pullRequests/route.tsx",
    "frontend/tests/pull-request-review-read-parity.e2e.ts",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["pull-request-and-review"],
  );
});

test("maps organization pull request routes before generic organization routes", () => {
  const result = runGate([
    "frontend/src/routes/organizations/$organizationName/pullrequests/route.tsx",
    "frontend/tests/pull-request-review-read-parity.e2e.ts",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["pull-request-and-review"],
  );
});

test("treats canonical migration crate as active canonical work, not deferred scope", () => {
  const result = runGate([
    "crates/migration/src/m20260407_000003_create_org_project_baseline_tables.rs",
    "crates/persistence/tests/org_project_repo_contract.rs",
  ]);

  assert.equal(result.verdict, "expected-nonparity");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.equal(
    result.capabilities.some(
      (entry) => entry.id === "second-priority-deferred" && entry.verdict === "block",
    ),
    false,
  );
});

test("blocks explicitly deferred second-priority legacy capabilities", () => {
  const result = runGate(["crates/vcs/src/svn/service.rs"]);

  assert.equal(result.verdict, "block");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.match(formatParitySummary(result), /deferred/i);
});

test("blocks implementation paths that are not mapped to any parity capability", () => {
  const result = runGate(["frontend/src/completely-unmapped-slice.ts"]);

  assert.equal(result.verdict, "block");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.match(result.summary, /No legacy parity mapping/);
});

test("passes runtime foundation config changes when spec and provenance updates land together", () => {
  const result = runGate([
    "frontend/src/runtime-config.ts",
    "frontend/src/runtime-config.spec.ts",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
});

test("treats wave-0 route-foundation files as mapped canonical work", () => {
  const result = runGate([
    "frontend/package.json",
    "frontend/index.html",
    "frontend/vite.config.ts",
    "frontend/tsconfig.json",
    "frontend/src/router.tsx",
    "frontend/src/runtime-config.ts",
    "frontend/src/main.tsx",
    "frontend/src/routes/__root.tsx",
    "frontend/src/auth-workspace-client.ts",
    "frontend/src/api/workspace.ts",
    "frontend/src/auth-workspace-client.spec.ts",
    "frontend/src/auth-workspace-shell.spec.tsx",
    "frontend/src/route-parity.spec.tsx",
    "frontend/tests/shell-routing-smoke.e2e.ts",
    "frontend/playwright.config.ts",
    "docs/provenance/core-parity-audit.md",
    "docs/provenance/phase-0b/organization.md",
    "docs/provenance/phase-0b/project.md",
  ]);

  assert.equal(result.implementationFiles.includes("frontend/package.json"), false);
  assert.equal(result.implementationFiles.includes("frontend/index.html"), false);
  assert.equal(result.implementationFiles.includes("frontend/vite.config.ts"), false);
  assert.equal(result.implementationFiles.includes("frontend/tsconfig.json"), false);
  assert.equal(result.unmappedImplementationFiles.includes("frontend/package.json"), false);
  assert.equal(
    result.unmappedImplementationFiles.includes("frontend/src/runtime-config.ts"),
    false,
  );
  assert.equal(result.unmappedImplementationFiles.includes("frontend/src/router.tsx"), false);
  assert.equal(result.unmappedImplementationFiles.includes("frontend/src/main.tsx"), false);
  assert.equal(
    result.unmappedImplementationFiles.includes("frontend/src/routes/__root.tsx"),
    false,
  );
  assert.equal(result.unmappedImplementationFiles.includes("frontend/src/api/workspace.ts"), false);
  assert.equal(result.unmappedImplementationFiles.includes("frontend/playwright.config.ts"), false);
});
