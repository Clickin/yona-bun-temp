import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { evaluateCommit } from "../scripts/audit-scala-html-goal-history.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const historyAuditPath = path.join(repoRoot, "scripts", "audit-scala-html-goal-history.mjs");

test("scala html goal history audit flags evidence-only frontend commits", () => {
  const result = evaluateCommit({
    changedFiles: ["frontend/tests/project-issues-empty.e2e.ts"],
    auditPatch: "",
  });

  assert.equal(result.blocked, true);
  assert.match(result.message, /evidence-only frontend work/u);
});

test("scala html goal history audit accepts route commits with complete legacy memo rows", () => {
  const result = evaluateCommit({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html`, `issue/partial_massupdate.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` focused E2E |\n",
  });

  assert.equal(result.blocked, false);
});

test("scala html goal history audit rejects multi-screen route commits", () => {
  const result = evaluateCommit({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` list branch | `issue/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` focused E2E |\n" +
      "+| 2026-07-02 | `/admin/sample/issues` search branch | `issue/partial_searchform.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` focused E2E |\n",
  });

  assert.equal(result.blocked, true);
  assert.match(result.message, /multi-screen frontend goal work/u);
});

test("scala html goal history audit accepts documented manual multi-screen exceptions", () => {
  const result = evaluateCommit({
    changedFiles: [
      "frontend/src/routes/organizations/$organizationName/issues.tsx",
      "frontend/src/routes/organizations/$organizationName/boards.tsx",
      "frontend/tests/organization-issues.e2e.ts",
      "frontend/tests/organization-boards.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+Manual multi-screen exception note, 2026-07-04:\n" +
      "+\n" +
      "+- Routes: `/organizations/weblabs/issues`, `/organizations/weblabs/boards`.\n" +
      "+- Reason: user explicitly requested parallel subagent execution for independent legacy Scala HTML page translation work.\n" +
      "+- Follow-up: keep future unattended goal commits to one screen state unless the user again requests a coordinated parallel slice.\n" +
      "+| 2026-07-04 | `/organizations/weblabs/issues` | `organization/group_issue_list.scala.html` | `frontend/src/routes/organizations/$organizationName/issues.tsx` rebuild | `frontend/tests/organization-issues.e2e.ts` focused E2E |\n" +
      "+| 2026-07-04 | `/organizations/weblabs/boards` | `organization/group_board_list.scala.html` | `frontend/src/routes/organizations/$organizationName/boards.tsx` rebuild | `frontend/tests/organization-boards.e2e.ts` focused E2E |\n",
  });

  assert.equal(result.blocked, false);
});

test("scala html goal history audit accepts documented manual evidence-only exceptions", () => {
  const result = evaluateCommit({
    changedFiles: [
      "frontend/src/app.css",
      "frontend/tests/project-code-commit-detail.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+Manual evidence-only exception note, 2026-07-12:\n" +
      "+\n" +
      "+- Route: `/admin/sample/commit/HEAD`.\n" +
      "+- Reason: supervised frozen legacy CSS cascade cleanup.\n" +
      "+- Follow-up: rerun the focused commit-detail E2E and visual sweep.\n",
  });

  assert.equal(result.blocked, false);
});

test("scala html goal history audit rejects memo rows naming E2E files not changed in the commit", () => {
  const result = evaluateCommit({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html`, `issue/partial_massupdate.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issue-detail.e2e.ts` focused E2E |\n",
  });

  assert.equal(result.blocked, true);
  assert.match(result.message, /incomplete audit row work/u);
});

test("scala html goal history audit rejects deleted focused E2E files as verification", () => {
  const result = evaluateCommit({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    changedFileStatuses: new Map([
      ["frontend/src/routes/$ownerName/$projectName/issues.tsx", "M"],
      ["frontend/tests/project-issues-empty.e2e.ts", "D"],
      ["docs/provenance/frontend-scala-html-goal-violation-audit.md", "M"],
    ]),
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html`, `issue/partial_massupdate.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` focused E2E |\n",
  });

  assert.equal(result.blocked, true);
  assert.match(result.message, /unverified frontend route work/u);
});

test("root scripts expose the scala html goal history audit smoke command", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const historyAuditSource = readFileSync(historyAuditPath, "utf8");

  assert.equal(
    packageJson.scripts["smoke:scala-html-goal-history"],
    "node scripts/audit-scala-html-goal-history.mjs",
  );
  assert.match(historyAuditSource, /evaluateScalaHtmlGoalGuard/u);
  assert.match(historyAuditSource, /--name-status/u);
  assert.match(historyAuditSource, /--diff-filter=ACMRD/u);
  assert.match(historyAuditSource, /arg === "--"/u);
  assert.match(historyAuditSource, /--fail-on-violation/u);
});
