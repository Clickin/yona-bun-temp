import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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

test("ignores deleted residual mixed-code files", () => {
  const result = runGate(["reference/mixed-code/packages/auth/src/app-service.ts"]);

  assert.equal(result.verdict, "pass");
  assert.equal(result.implementationFiles.length, 0);
});

test("blocks recreated residual mixed-code files", () => {
  const filePath = "reference/mixed-code/packages/auth/src/app-service.ts";
  const absolutePath = path.join(TEST_REPO_ROOT, filePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, "export {};\n");

  const result = runGate([filePath]);

  assert.equal(result.verdict, "block");
  assert.deepEqual(result.implementationFiles, [filePath]);
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
    "react-doctor.config.json",
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

test("ignores frontend test helper files that support route parity tests", () => {
  const result = runGate(["frontend/src/auth-workspace-shell.test-helpers.tsx"]);

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

test("maps anonymous help route changes to the help parity slice", () => {
  const result = runGate([
    "frontend/src/routes/-help-views.tsx",
    "frontend/src/help-route-parity.spec.tsx",
    "docs/provenance/legacy-porting-progress.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["anonymous-help-route"],
  );
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

test("maps auth runtime context changes to the account lifecycle slice", () => {
  const result = runGate([
    "frontend/src/app-runtime-context.tsx",
    "frontend/src/routes/users/loginform/route.tsx",
    "frontend/src/routes/users/signupform/route.tsx",
    "frontend/src/routes/lostPassword/route.tsx",
    "frontend/src/routes/resetPassword/route.tsx",
    "frontend/src/auth-workspace-shell.spec.tsx",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["auth-account-lifecycle"],
  );
});

test("maps restricted sample route changes to the account lifecycle slice", () => {
  const result = runGate([
    "frontend/src/routes/-restricted-view.tsx",
    "frontend/src/restricted-route-parity.spec.tsx",
    "docs/provenance/legacy-porting-progress.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["auth-account-lifecycle"],
  );
});

test("accepts template-first P0 report as global shell implementation evidence", () => {
  const result = runGate([
    "frontend/index.html",
    "frontend/scripts/build-legacy-css.mjs",
    "frontend/src/main.tsx",
    "frontend/src/routes/__root.tsx",
    "frontend/src/routes/-auth-views.tsx",
    "frontend/src/auth-workspace-shell.spec.tsx",
    "docs/provenance/ui-parity-reports/template-first-p0-global-shell.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id).sort(),
    ["auth-account-lifecycle", "public-landing", "rust-foundation-and-runtime-bootstrap"].sort(),
  );
});

test("ignores static legacy asset payload files", () => {
  const result = runGate([
    "frontend/public/legacy-assets/images/project_default_logo.png",
    "frontend/public/legacy-assets/stylesheets/yobi.css",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(result.implementationFiles.length, 0);
  assert.match(result.summary, /No implementation files/);
});

test("maps shared frontend view model changes to shared view model evidence", () => {
  const result = runGate([
    "frontend/src/app-view-models.ts",
    "frontend/src/routes/-view-models.ts",
    "frontend/src/auth-workspace-shell.spec.tsx",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["shared-frontend-view-models"],
  );
});

test("maps frontend REST API wrapper changes to the API query boundary slice", () => {
  const result = runGate([
    "frontend/src/api/types.ts",
    "frontend/src/api/milestones.ts",
    "frontend/src/api/session.ts",
    "frontend/src/api/translation.ts",
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

test("accepts notification route parity tests as notification frontend evidence", () => {
  const result = runGate([
    "frontend/src/routes/notification/route.tsx",
    "frontend/src/route-parity.spec.tsx",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["notification-inbox-and-mail-staging"],
  );
});

test("maps project label API files to the issue lifecycle slice", () => {
  const result = runGate([
    "frontend/src/api/project-labels.ts",
    "crates/server/tests/issue_label_contract.rs",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["issue-lifecycle"],
  );
});

test("maps monolithic server Markdown renderer changes with focused evidence", () => {
  const result = runGate([
    "crates/server/src/lib.rs",
    "crates/server/tests/issue_core_contract.rs",
    "docs/provenance/phase-0b/issue.md",
    "docs/provenance/legacy-porting-progress.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["project-markdown-rendering"],
  );
});

test("maps PR and code Markdown renderer changes with focused evidence", () => {
  const result = runGate([
    "crates/server/src/lib.rs",
    "crates/server/tests/pull_request_read_contract.rs",
    "crates/server/tests/pull_request_mutation_contract.rs",
    "crates/server/tests/code_browser_contract.rs",
    "docs/provenance/phase-0b/pull-request-review.md",
    "docs/provenance/phase-0b/code-browser.md",
    "docs/provenance/legacy-porting-progress.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["project-markdown-rendering"],
  );
});

test("maps Markdown tasklist surface opt-ins to the renderer capability", () => {
  const result = runGate([
    "frontend/src/routes/-markdown-renderer.tsx",
    "frontend/src/routes/-syntax-highlighting.tsx",
    "frontend/src/routes/-board-views.tsx",
    "frontend/src/routes/-issue-views.tsx",
    "frontend/src/markdown-renderer.spec.tsx",
    "docs/provenance/legacy-porting-progress.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["project-markdown-rendering"],
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

test("maps public user profile files to the user workspace provenance slice", () => {
  const result = runGate([
    "frontend/src/api/query-keys.ts",
    "frontend/src/auth-workspace-client.ts",
    "frontend/src/api/users.ts",
    "frontend/src/routes/$user/route.tsx",
    "frontend/src/routes/-workspace-views.tsx",
    "frontend/tests/user-profile-parity.e2e.ts",
    "docs/provenance/phase-0b/user-workspace.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["frontend-api-query-boundary", "public-user-profile"],
  );
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [
      ["frontend-api-query-boundary", "partial"],
      ["public-user-profile", "parity"],
    ],
  );
});

test("maps user statistics API client changes to user workspace provenance", () => {
  const result = runGate([
    "frontend/src/api/query-keys.ts",
    "frontend/src/api/users.ts",
    "frontend/src/api-query.spec.ts",
    "docs/provenance/phase-0b/user-workspace.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["frontend-api-query-boundary", "public-user-profile"],
  );
});

test("maps user files route changes to the workspace provenance slice", () => {
  const result = runGate([
    "frontend/src/api/workspace.ts",
    "frontend/src/routes/user/files/route.tsx",
    "frontend/src/user-files-parity.spec.tsx",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => entry.id),
    ["workspace-recent-favorite-default-landing"],
  );
});

test("treats workspace settings route cleanup as a closed parity slice with coordination evidence", () => {
  const result = runGate([
    "frontend/src/routes/user/editform/index.tsx",
    "frontend/src/routes/user/editform/password/route.tsx",
    "docs/plans/2026-06-27-ui-parity-coordination.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["workspace-recent-favorite-default-landing", "parity"]],
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

test("blocks second-priority legacy capabilities without closure evidence", () => {
  const result = runGate(["crates/integrations/src/ldap/service.rs"]);

  assert.equal(result.verdict, "block");
  assert.equal(shouldBlockForStrictGate(result), true);
  assert.match(formatParitySummary(result), /without tests|provenance|legacy references/i);
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

test("passes root shell changes when legacy HTML audit provenance updates land together", () => {
  const result = runGate([
    "frontend/src/routes/__root.tsx",
    "frontend/src/routes/sidebar/route.tsx",
    "frontend/tests/legacy-rendered-page-audit.e2e.ts",
    "docs/provenance/legacy-html-page-audit.md",
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
