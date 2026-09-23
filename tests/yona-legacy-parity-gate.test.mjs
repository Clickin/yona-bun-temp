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

test("active template-first UI parity surfaces are closed in the gate", () => {
  const uiParityCases = [
    [
      "public-landing",
      [
        "frontend/src/routes/index.tsx",
        "frontend/tests/public-landing-parity.e2e.ts",
        "docs/provenance/ui-parity-reports/template-first-p0-global-shell.md",
      ],
    ],
    [
      "public-project-directory",
      [
        "frontend/src/routes/projects/route.tsx",
        "frontend/src/project-directory-route.spec.tsx",
        "docs/provenance/core-parity-audit.md",
      ],
    ],
    [
      "public-organization-directory",
      [
        "frontend/src/routes/orgs/route.tsx",
        "frontend/src/organization-directory-route.spec.tsx",
        "docs/provenance/core-parity-audit.md",
      ],
    ],
    [
      "anonymous-help-route",
      [
        "frontend/src/routes/-help-views.tsx",
        "frontend/src/help-route-parity.spec.tsx",
        "docs/agents/06-phase-plan.md",
      ],
    ],
    [
      "project-markdown-rendering",
      [
        "frontend/src/routes/-markdown-renderer.tsx",
        "frontend/src/markdown-renderer.spec.tsx",
        "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
      ],
    ],
    [
      "shared-frontend-view-models",
      [
        "frontend/src/app-view-models.ts",
        "frontend/src/auth-workspace-shell.spec.tsx",
        "docs/provenance/core-parity-audit.md",
      ],
    ],
    [
      "frontend-api-query-boundary",
      [
        "frontend/src/query-client.tsx",
        "frontend/src/api-query.spec.ts",
        "docs/provenance/ui-parity-reports/ui-parity-search-notification.md",
      ],
    ],
    [
      "board-posting-core",
      [
        "frontend/src/routes/-board-views.tsx",
        "frontend/tests/board-posting-parity.e2e.ts",
        "docs/provenance/core-parity-audit.md",
      ],
    ],
    [
      "auth-account-lifecycle",
      [
        "frontend/src/routes/users/loginform.tsx",
        "frontend/tests/auth-public-entry-parity.e2e.ts",
        "docs/provenance/ui-parity-reports/template-first-p1-auth-public-home.md",
      ],
    ],
    [
      "auth-account-lifecycle",
      [
        "frontend/src/routes/[_]UIKit.tsx",
        "frontend/tests/ui-kit.e2e.ts",
        "docs/provenance/ui-parity-reports/template-first-p1-auth-public-home.md",
      ],
    ],
    [
      "public-user-profile",
      [
        "frontend/src/routes/$user.tsx",
        "frontend/tests/user-profile-parity.e2e.ts",
        "docs/provenance/ui-parity-reports/ui-parity-user-workspace-profile.md",
      ],
    ],
    [
      "pull-request-and-review",
      [
        "frontend/src/routes/$owner/$projectName/pullRequests/route.tsx",
        "frontend/tests/pull-request-review-read-parity.e2e.ts",
        "docs/provenance/ui-parity-reports/ui-parity-pull-request-review.md",
      ],
    ],
    [
      "organization-core-cru",
      [
        "frontend/src/routes/-organization-views.tsx",
        "frontend/tests/organization-parity.e2e.ts",
        "docs/provenance/ui-parity-reports/ui-parity-directory-organization.md",
      ],
    ],
    [
      "project-core-cru-and-enrollment",
      [
        "frontend/src/routes/-project-views.tsx",
        "frontend/src/project-home-tabs.spec.tsx",
        "docs/provenance/ui-parity-reports/template-first-p2-project-shell.md",
      ],
    ],
    [
      "workspace-recent-favorite-default-landing",
      [
        "frontend/src/routes/user/editform/index.tsx",
        "frontend/src/workspace-settings-parity.spec.tsx",
        "docs/plans/2026-06-27-ui-parity-coordination.md",
      ],
    ],
    [
      "notification-inbox-and-mail-staging",
      [
        "frontend/src/routes/notification/route.tsx",
        "frontend/src/route-parity.spec.tsx",
        "docs/provenance/ui-parity-reports/ui-parity-search-notification.md",
      ],
    ],
    [
      "issue-lifecycle",
      [
        "frontend/src/routes/-issue-views.tsx",
        "frontend/tests/issue-detail-parity.e2e.ts",
        "docs/provenance/ui-parity-reports/ui-parity-issues.md",
      ],
    ],
    [
      "search",
      [
        "frontend/src/routes/-search-views.tsx",
        "frontend/src/search-i18n.spec.tsx",
        "docs/provenance/core-parity-audit.md",
      ],
    ],
    [
      "site-admin-core",
      [
        "frontend/src/api/site-admin.ts",
        "frontend/src/routes/sites/-pagination.tsx",
        "frontend/tests/site-admin-user-list-parity.e2e.ts",
        "docs/provenance/core-parity-audit.md",
      ],
    ],
    [
      "repository-and-smart-http",
      [
        "frontend/src/routes/-code-views.tsx",
        "frontend/tests/project-code-comment-upload-parity.e2e.ts",
        "docs/provenance/core-parity-audit.md",
      ],
    ],
    [
      "attachment-and-asset-acl",
      [
        "frontend/src/api/attachments.ts",
        "crates/server/tests/assets_contract.rs",
        "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
      ],
    ],
  ];

  for (const [expectedId, changedFiles] of uiParityCases) {
    const result = runGate(changedFiles);
    const capability = result.capabilities.find((entry) => entry.id === expectedId);

    assert.equal(result.verdict, "pass", expectedId);
    assert.notEqual(capability, undefined, expectedId);
    assert.notEqual(capability.status, "gap", expectedId);
    assert.notEqual(capability.status, "partial", expectedId);
    assert.notEqual(capability.status, "deferred", expectedId);
  }
});

test("maps authenticated home evidence to public landing slice", () => {
  const result = runGate([
    "frontend/src/routes/index.tsx",
    "frontend/tests/authenticated-home-empty-notifications.e2e.ts",
    "docs/provenance/ui-parity-reports/template-first-p1-auth-public-home.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["public-landing", "parity"]],
  );
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
    ".claude/skills/yona-frontend-parity/SKILL.md",
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

test("ignores the isolated Bun backend feasibility experiment", () => {
  const changedFiles = [
    "experiments/bun-port/backend/rpc.ts",
    "experiments/bun-port/web/src/routes/login.tsx",
  ];
  const result = runGate(changedFiles);

  assert.equal(result.verdict, "pass");
  assert.deepEqual(result.implementationFiles, []);
  assert.deepEqual(result.skippedFiles, changedFiles);
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

test("maps project directory backend contract changes to the project directory parity slice", () => {
  const result = runGate([
    "crates/server/src/routes/projects.rs",
    "crates/server/src/routes/utils.rs",
    "crates/server/tests/project_fork_contract.rs",
    "frontend/tests/stylex-projects-fork-origin.e2e.ts",
    "docs/provenance/frontend-stylex-migration-ledger.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["public-project-directory", "parity"]],
  );
});

test("maps anonymous help route changes to the help parity slice", () => {
  const result = runGate([
    "frontend/src/routes/[_]help.tsx",
    "frontend/tests/help-toc.e2e.ts",
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
    "crates/persistence/src/repo.rs",
    "crates/server/tests/rest_contract.rs",
  ]);

  assert.equal(result.verdict, "expected-nonparity");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.match(result.summary, /Canonical schema and persistence foundation/);
});

test("passes partial legacy slices when tests and parity audit updates land together", () => {
  const result = runGate([
    "crates/persistence/src/repo.rs",
    "crates/server/tests/rest_contract.rs",
    "docs/provenance/core-parity-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
});

test("maps auth runtime context changes to the account lifecycle slice", () => {
  const result = runGate([
    "frontend/src/app-runtime-context.tsx",
    "frontend/src/routes/users/login.tsx",
    "frontend/src/routes/users/loginform.tsx",
    "frontend/src/routes/users/signupform/route.tsx",
    "frontend/src/routes/login.tsx",
    "frontend/src/routes/register.tsx",
    "frontend/src/routes/forgot-password.tsx",
    "frontend/src/routes/lostPassword/route.tsx",
    "frontend/src/routes/resetPassword/route.tsx",
    "frontend/tests/auth-aliases.e2e.ts",
    "frontend/src/routes/restart.tsx",
    "frontend/tests/restart.e2e.ts",
    "frontend/src/routes/secret.tsx",
    "frontend/tests/secret-setup.e2e.ts",
    "frontend/src/routes/verify/$loginId/$verificationCode.tsx",
    "frontend/tests/verify-user.e2e.ts",
    "frontend/src/auth-workspace-shell.spec.tsx",
    "docs/provenance/ui-parity-reports/template-first-p1-auth-public-home.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["auth-account-lifecycle", "parity"]],
  );
});

test("maps restricted sample route changes to the account lifecycle slice", () => {
  const result = runGate([
    "frontend/src/routes/restricted.tsx",
    "frontend/tests/restricted.e2e.ts",
    "docs/provenance/ui-parity-reports/template-first-p1-auth-public-home.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["auth-account-lifecycle", "parity"]],
  );
});

test("accepts template-first P0 report as global shell implementation evidence", () => {
  const result = runGate([
    "frontend/index.html",
    "frontend/src/main.tsx",
    "frontend/src/legacy-fallback-mode.ts",
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
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["shared-frontend-view-models", "parity"]],
  );
});

test("maps frontend REST API wrapper changes to the API query boundary slice", () => {
  const result = runGate([
    "frontend/src/api/types.ts",
    "frontend/src/api/milestones.ts",
    "frontend/src/api/session.ts",
    "frontend/src/api/translation.ts",
    "frontend/src/api-query.spec.ts",
    "docs/provenance/ui-parity-reports/ui-parity-issues.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["frontend-api-query-boundary", "parity"]],
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
    "frontend/src/routes/notifications.tsx",
    "frontend/tests/authenticated-home-empty-notifications.e2e.ts",
    "docs/provenance/ui-parity-reports/ui-parity-search-notification.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["notification-inbox-and-mail-staging", "parity"]],
  );
});

test("maps project label API files to the issue lifecycle slice", () => {
  const result = runGate([
    "frontend/src/api/project-labels.ts",
    "crates/server/tests/issue_label_contract.rs",
    "docs/provenance/ui-parity-reports/ui-parity-issues.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["issue-lifecycle", "parity"]],
  );
});

test("maps monolithic server Markdown renderer changes with focused evidence", () => {
  const result = runGate([
    "crates/server/src/lib.rs",
    "crates/server/tests/issue_core_contract.rs",
    "docs/provenance/ui-parity-reports/ui-parity-issues.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["project-markdown-rendering", "parity"]],
  );
});

test("maps PR and code Markdown renderer changes with focused evidence", () => {
  const result = runGate([
    "crates/server/src/lib.rs",
    "crates/server/tests/pull_request_read_contract.rs",
    "crates/server/tests/pull_request_mutation_contract.rs",
    "crates/server/tests/code_browser_contract.rs",
    "docs/provenance/ui-parity-reports/ui-parity-pull-request-review.md",
    "docs/provenance/ui-parity-reports/ui-parity-code-vcs.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["project-markdown-rendering", "parity"]],
  );
});

test("maps Markdown tasklist surface opt-ins to the renderer capability", () => {
  const result = runGate([
    "frontend/src/routes/-markdown-renderer.tsx",
    "frontend/src/routes/-syntax-highlighting.tsx",
    "frontend/src/routes/-board-views.tsx",
    "frontend/src/routes/-issue-views.tsx",
    "frontend/src/markdown-renderer.spec.tsx",
    "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["project-markdown-rendering", "parity"]],
  );
});

test("maps shared frontend query keys to the API query boundary", () => {
  const result = runGate([
    "frontend/src/api/query-keys.ts",
    "frontend/src/api-query.spec.ts",
    "docs/provenance/ui-parity-reports/ui-parity-search-notification.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["frontend-api-query-boundary", "parity"]],
  );
});

test("maps public user profile files to the user workspace provenance slice", () => {
  const result = runGate([
    "frontend/src/api/query-keys.ts",
    "frontend/src/auth-workspace-client.ts",
    "frontend/src/api/users.ts",
    "frontend/src/routes/$user.tsx",
    "frontend/src/routes/-workspace-views.tsx",
    "crates/persistence/src/repo/common.rs",
    "crates/persistence/src/repo/project_activity.rs",
    "crates/persistence/src/repo_types.rs",
    "crates/server/src/api_types.rs",
    "crates/server/src/routes/users.rs",
    "crates/server/src/routes/workspace.rs",
    "crates/server/tests/rest_contract.rs",
    "frontend/tests/user-profile-parity.e2e.ts",
    "docs/provenance/ui-parity-reports/ui-parity-user-workspace-profile.md",
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
      ["frontend-api-query-boundary", "parity"],
      ["public-user-profile", "parity"],
    ],
  );
});

test("maps user statistics API client changes to user workspace provenance", () => {
  const result = runGate([
    "frontend/src/api/query-keys.ts",
    "frontend/src/api/users.ts",
    "frontend/src/api-query.spec.ts",
    "docs/provenance/ui-parity-reports/ui-parity-user-workspace-profile.md",
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

test("treats attachment upload surfaces as a closed parity slice", () => {
  const result = runGate([
    "frontend/src/api/attachments.ts",
    "crates/server/tests/assets_contract.rs",
    "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["attachment-and-asset-acl", "parity"]],
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
    "docs/provenance/ui-parity-reports/ui-parity-pull-request-review.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["pull-request-and-review", "parity"]],
  );
});

test("maps pull request persistence payload changes to PR evidence", () => {
  const result = runGate([
    "crates/persistence/src/repo/record_helpers.rs",
    "crates/persistence/src/repo_types.rs",
    "crates/server/src/routes/pull_requests.rs",
    "frontend/src/api/pull-requests.ts",
    "frontend/src/routes/$ownerName/$projectName/pullRequests.tsx",
    "frontend/tests/project-pullrequests.e2e.ts",
    "docs/provenance/ui-parity-reports/ui-parity-pull-request-review.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["pull-request-and-review", "parity"]],
  );
});

test("maps search persistence payload changes to search evidence", () => {
  const result = runGate([
    "crates/persistence/src/repo/search.rs",
    "crates/persistence/src/repo_types.rs",
    "frontend/src/api/search.ts",
    "frontend/src/routes/-search-screen.tsx",
    "frontend/tests/search-global.e2e.ts",
    "docs/provenance/frontend-scala-html-goal-violation-audit.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["search", "parity"]],
  );
});

test("maps organization pull request routes before generic organization routes", () => {
  const result = runGate([
    "frontend/src/routes/organizations/$organizationName/pullrequests/route.tsx",
    "frontend/tests/pull-request-review-read-parity.e2e.ts",
    "docs/provenance/ui-parity-reports/ui-parity-pull-request-review.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["pull-request-and-review", "parity"]],
  );
});

test("treats organization directory and shell routes as a closed parity slice", () => {
  const result = runGate([
    "frontend/src/routes/-organization-views.tsx",
    "frontend/src/organization-shell-i18n.spec.tsx",
    "docs/provenance/ui-parity-reports/ui-parity-directory-organization.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["organization-core-cru", "parity"]],
  );
});

test("accepts template-first P2 project shell evidence for project view changes", () => {
  const result = runGate([
    "frontend/src/routes/-project-views.tsx",
    "frontend/src/project-home-tabs.spec.tsx",
    "docs/provenance/ui-parity-reports/template-first-p2-project-shell.md",
  ]);

  assert.equal(result.verdict, "pass");
  assert.equal(shouldBlockForStrictGate(result), false);
  assert.deepEqual(
    result.capabilities.map((entry) => [entry.id, entry.status]),
    [["project-core-cru-and-enrollment", "parity"]],
  );
});

test("treats canonical migration crate as active canonical work, not deferred scope", () => {
  const result = runGate([
    "crates/migration/src/m20260407_000003_create_org_project_baseline_tables.rs",
    "crates/persistence/tests/org_project_repo_contract.rs",
  ]);

  assert.equal(result.verdict, "expected-nonparity");
  assert.equal(shouldBlockForStrictGate(result), false);
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
    result.unmappedImplementationFiles.includes("frontend/src/legacy-fallback-mode.ts"),
    false,
  );
  assert.equal(
    result.unmappedImplementationFiles.includes("frontend/src/routes/__root.tsx"),
    false,
  );
  assert.equal(result.unmappedImplementationFiles.includes("frontend/src/api/workspace.ts"), false);
  assert.equal(result.unmappedImplementationFiles.includes("frontend/playwright.config.ts"), false);
});
