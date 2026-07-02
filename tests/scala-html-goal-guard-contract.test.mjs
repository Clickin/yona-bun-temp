import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateScalaHtmlGoalGuard,
  formatScalaHtmlGoalGuardSummary,
} from "../tools/scala-html-goal-guard.mjs";

test("blocks frontend e2e metric-only work without a TSX route implementation", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/tests/organization-home.e2e.ts",
      "docs/provenance/ui-parity-reports/template-first-p6-organization-directory-workspace.md",
    ],
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /evidence-only frontend work/u);
});

test("blocks CSS-only layout restoration without a TSX route implementation", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/app.css",
      "docs/provenance/ui-parity-reports/template-first-p7-site-admin-error-security.md",
    ],
    env: {},
  });

  assert.equal(result.blocked, true);
});

test("passes frontend evidence when a route TSX implementation changes too", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/ui-parity-reports/template-first-p3-issues-editor-comments.md",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html`, `issue/partial_list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` whole-screen E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, false);
});

test("blocks frontend route TSX work without the Scala HTML audit memo", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
    ],
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /undocumented frontend route work/u);
});

test("blocks frontend route TSX plus E2E work without the Scala HTML audit memo", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
      "frontend/tests/project-issue-detail.e2e.ts",
    ],
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /undocumented frontend route work/u);
});

test("passes frontend route TSX work when the Scala HTML audit memo is updated", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html`, `issue/partial_list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, false);
});

test("blocks frontend route TSX work when the focused E2E file is not changed", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html`, `issue/partial_list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /unverified frontend route work/u);
});

test("blocks frontend route TSX work when the audit memo diff lacks a Scala HTML source", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | legacy issue list | TSX rebuild | E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /weak audit memo work/u);
});

test("blocks frontend route TSX work when the audit row names a nonexistent Scala HTML source", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/does_not_exist.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /nonexistent legacy source work/u);
});

test("checks only the legacy source column for Scala HTML source existence", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` mentions legacy helper common.calendar.scala.html in prose | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, false);
});

test("blocks frontend route TSX work when the audit row does not name the route file", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html`, `issue/partial_list.scala.html` | issue list rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /incomplete audit row work/u);
});

test("blocks frontend route TSX work when the audit row lacks focused E2E verification", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html`, `issue/partial_list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | focused verification pending |\n",
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /incomplete audit row work/u);
});

test("allows explicitly marked non-goal frontend route commits", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: ["frontend/src/routes/__root.tsx"],
    env: { YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE: "1" },
  });

  assert.equal(result.blocked, false);
});

test("does not block pure audit docs outside ui parity reports", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: ["docs/provenance/frontend-scala-html-goal-violation-audit.md"],
    env: {},
  });

  assert.equal(result.blocked, false);
});

test("allows explicitly marked evidence-only audit commits", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: ["frontend/tests/search-global.e2e.ts"],
    env: { YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY: "1" },
  });

  assert.equal(result.blocked, false);
});
