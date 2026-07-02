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

test("root scripts expose the scala html goal history audit smoke command", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const historyAuditSource = readFileSync(historyAuditPath, "utf8");

  assert.equal(
    packageJson.scripts["smoke:scala-html-goal-history"],
    "node scripts/audit-scala-html-goal-history.mjs",
  );
  assert.match(historyAuditSource, /evaluateScalaHtmlGoalGuard/u);
  assert.match(historyAuditSource, /--diff-filter=ACMRD/u);
  assert.match(historyAuditSource, /arg === "--"/u);
  assert.match(historyAuditSource, /--fail-on-violation/u);
});
