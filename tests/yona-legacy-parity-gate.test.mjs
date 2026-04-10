import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateParityGate,
  formatParitySummary,
  shouldBlockForStrictGate,
} from "../tools/yona-parity-gate.mjs";

test("passes when only documentation changes are present", () => {
  const result = evaluateParityGate({
    changedFiles: ["docs/agents/09-llm-onboarding-checklist.md"],
  });

  assert.equal(result.verdict, "pass");
  assert.equal(result.capabilities.length, 0);
  assert.match(result.summary, /No implementation files/);
});

test("ignores reference-only root mixed-code changes", () => {
  const result = evaluateParityGate({
    changedFiles: ["packages/auth/src/app-service.ts"],
  });

  assert.equal(result.verdict, "pass");
  assert.equal(result.implementationFiles.length, 0);
  assert.match(result.summary, /No implementation files/);
});

test("blocks parity-complete canonical route changes without accompanying parity evidence", () => {
  const result = evaluateParityGate({
    changedFiles: ["yona-rust/frontend/src/routes/_app.projects.index.tsx"],
  });

  assert.equal(result.verdict, "block");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["public-project-directory"],
  );
});

test("passes parity-complete canonical route changes when a parity test changes alongside them", () => {
  const result = evaluateParityGate({
    changedFiles: [
      "yona-rust/frontend/src/routes/_app.projects.index.tsx",
      "tests/yona-legacy-parity-gate.test.mjs",
      "docs/provenance/core-parity-audit.md",
    ],
  });

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
});

test("marks partial legacy slices as expected non-parity until audit evidence lands", () => {
  const result = evaluateParityGate({
    changedFiles: [
      "yona-rust/crates/server/src/session.rs",
      "yona-rust/crates/server/tests/auth_workspace_contract.rs",
    ],
  });

  assert.equal(result.verdict, "expected-nonparity");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.match(result.summary, /Auth and account lifecycle/);
});

test("passes partial legacy slices when tests and parity audit updates land together", () => {
  const result = evaluateParityGate({
    changedFiles: [
      "yona-rust/crates/server/src/session.rs",
      "yona-rust/crates/server/tests/auth_workspace_contract.rs",
      "docs/provenance/core-parity-audit.md",
    ],
  });

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
});

test("treats canonical migration crate as active canonical work, not deferred scope", () => {
  const result = evaluateParityGate({
    changedFiles: [
      "yona-rust/crates/migration/src/m20260407_000003_create_org_project_baseline_tables.rs",
      "yona-rust/crates/persistence/tests/org_project_repo_contract.rs",
    ],
  });

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
  const result = evaluateParityGate({
    changedFiles: ["yona-rust/crates/vcs/src/svn/service.rs"],
  });

  assert.equal(result.verdict, "block");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.match(formatParitySummary(result), /deferred/i);
});

test("blocks implementation paths that are not mapped to any parity capability", () => {
  const result = evaluateParityGate({
    changedFiles: ["yona-rust/frontend/src/completely-unmapped-slice.ts"],
  });

  assert.equal(result.verdict, "block");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.match(result.summary, /No legacy parity mapping/);
});

test("treats wave-0 route-foundation files as mapped canonical work", () => {
  const result = evaluateParityGate({
    changedFiles: [
      "yona-rust/frontend/package.json",
      "yona-rust/frontend/index.html",
      "yona-rust/frontend/vite.config.ts",
      "yona-rust/frontend/tsconfig.json",
      "yona-rust/frontend/src/route-table.ts",
      "yona-rust/frontend/src/runtime-config.ts",
      "yona-rust/frontend/src/App.tsx",
      "yona-rust/frontend/src/auth-workspace-client.ts",
      "yona-rust/frontend/src/auth-workspace-shell.tsx",
      "yona-rust/frontend/src/auth-workspace-client.spec.ts",
      "yona-rust/frontend/src/auth-workspace-shell.spec.tsx",
      "yona-rust/frontend/src/route-parity.spec.tsx",
      "yona-rust/frontend/tests/shell-routing-smoke.e2e.ts",
      "yona-rust/frontend/playwright.config.ts",
      "docs/provenance/core-parity-audit.md",
      "docs/provenance/phase-0b/organization.md",
      "docs/provenance/phase-0b/project.md",
    ],
  });

  assert.equal(
    result.unmappedImplementationFiles.includes("yona-rust/frontend/package.json"),
    false,
  );
  assert.equal(
    result.unmappedImplementationFiles.includes("yona-rust/frontend/src/runtime-config.ts"),
    false,
  );
  assert.equal(
    result.unmappedImplementationFiles.includes("yona-rust/frontend/src/route-table.ts"),
    false,
  );
  assert.equal(
    result.unmappedImplementationFiles.includes("yona-rust/frontend/src/App.tsx"),
    false,
  );
  assert.equal(
    result.unmappedImplementationFiles.includes("yona-rust/frontend/playwright.config.ts"),
    false,
  );
});
