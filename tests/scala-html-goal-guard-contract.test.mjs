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
    env: { YONA_ENFORCE_SCALA_HTML_SINGLE_ROW: "1" },
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
    env: { YONA_ENFORCE_SCALA_HTML_SINGLE_ROW: "1" },
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

test("blocks frontend route TSX work that ports legacy jQuery DOM manipulation", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-issue-detail.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issue/11` | `issue/view.scala.html` | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx` rebuild | `frontend/tests/project-issue-detail.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        "+  const legacyHandler = () => $('#upvote-issue-weight').on('click', () => $('.weight-number').html('3'));\n",
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /legacy jQuery\/DOM escape work/u);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /React state\/events/u);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /TanStack Query useMutation/u);
});

test("blocks frontend route TSX work that adds inline scripts or direct DOM lookups", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/issues.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        "+  return <script dangerouslySetInnerHTML={{ __html: \"document.querySelector('.filter').remove()\" }} />;\n",
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /legacy jQuery\/DOM escape work/u);
});

test("blocks frontend route TSX work that adds imperative DOM event and style control", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-issue-detail.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-03 | `/admin/sample/issue/11` | `issue/view.scala.html` | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx` rebuild | `frontend/tests/project-issue-detail.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        "+  modal.addEventListener('click', handleClick);\n" +
          "+  modal.classList.add('hide');\n" +
          "+  modal.style.display = 'none';\n",
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /legacy jQuery\/DOM escape work/u);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /React state\/events/u);
});

test("allows frontend route TSX work that uses React events and TanStack Query mutation", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-issue-detail.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issue/11` | `issue/view.scala.html` | `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx` rebuild | `frontend/tests/project-issue-detail.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        "+  const mutation = useMutation({ mutationFn: updateIssueWeight, onSuccess: () => queryClient.invalidateQueries({ queryKey }) });\n" +
          "+  return <button onClick={() => mutation.mutate({ direction: 'upvote' })}>Up</button>;\n",
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, false);
});

test("blocks frontend route TSX work that adds raw anchor tags", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/pullRequests.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-pullrequests.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/pullRequests` | `git/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` rebuild | `frontend/tests/project-pullrequests.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        '+  return <a href="#" onClick={handleStateTabClick}>Open</a>;\n' +
          '+  return <a href="javascript:void(0)" className="title-prefix">[API]</a>;\n',
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /anchor tag work/u);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /TanStack Router Link/u);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /TanStack Query useMutation/u);
});

test("blocks frontend route TSX work that creates anchor tags through createElement", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/pullRequests.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-pullrequests.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-03 | `/admin/sample/pullRequests` | `git/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` rebuild | `frontend/tests/project-pullrequests.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        '+  return createElement("a", { href: `/admin/sample/pullRequests` }, "Open");\n' +
          "+  return React.createElement('a', { href: '#', onClick: handleClick }, 'Open');\n",
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /anchor tag work/u);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /TanStack Router Link/u);
});

test("blocks frontend route TSX work that creates script or style tags through createElement", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/issues.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-03 | `/admin/sample/issues` | `issue/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        '+  return createElement("script", { dangerouslySetInnerHTML: { __html: legacyScript } });\n' +
          "+  return React.createElement('style', null, '.filter { display: none }');\n",
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /legacy jQuery\/DOM escape work/u);
});

test("blocks frontend route TSX work that mutates DOM attributes through refs", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/pullRequests.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-pullrequests.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-03 | `/admin/sample/pullRequests` | `git/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` rebuild | `frontend/tests/project-pullrequests.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        '+  ref.current?.setAttribute("href", `/admin/sample/pullRequests`);\n' +
          '+  ref.current?.removeAttribute("data-toggle");\n' +
          '+  ref.current?.toggleAttribute("hidden", true);\n',
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /legacy jQuery\/DOM escape work/u);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /direct DOM mutation/u);
});

test("blocks frontend route TSX work that adds direct window navigation", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/pullRequests.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-pullrequests.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/pullRequests` | `git/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` rebuild | `frontend/tests/project-pullrequests.e2e.ts` E2E |\n",
    routePatches: new Map([
      [routeFile, "+  window.location.href = `${form.action}?${params.toString()}`;\n"],
    ]),
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /legacy jQuery\/DOM escape work/u);
});

test("allows frontend route TSX work that uses Link for internal navigation", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/pullRequests.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-pullrequests.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/pullRequests` | `git/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` rebuild | `frontend/tests/project-pullrequests.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        '+  return <Link to="/$ownerName/$projectName/pullRequests" params={params} search={search}>Open</Link>;\n',
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, false);
});

test("allows frontend route TSX work that uses Link href for external navigation", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/pullRequests.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-pullrequests.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/pullRequests` | `git/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` rebuild | `frontend/tests/project-pullrequests.e2e.ts` E2E |\n",
    routePatches: new Map([
      [routeFile, '+  return <Link href="https://example.com/docs">Docs</Link>;\n'],
    ]),
    env: {},
  });

  assert.equal(result.blocked, false);
});

test("allows frontend route TSX work that uses createElement for React components", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/pullRequests.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-pullrequests.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-03 | `/admin/sample/pullRequests` | `git/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` rebuild | `frontend/tests/project-pullrequests.e2e.ts` E2E |\n",
    routePatches: new Map([
      [routeFile, "+  return createElement(ProjectPullRequestList, { items: pullRequests });\n"],
    ]),
    env: {},
  });

  assert.equal(result.blocked, false);
});

test("blocks frontend route TSX work that adds legacy custom attributes to Link", () => {
  const routeFile = "frontend/src/routes/$ownerName/$projectName/pullRequests.tsx";
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      routeFile,
      "frontend/tests/project-pullrequests.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/pullRequests` | `git/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` rebuild | `frontend/tests/project-pullrequests.e2e.ts` E2E |\n",
    routePatches: new Map([
      [
        routeFile,
        '+  return <Link to="/$ownerName/$projectName/pullRequests" data-url={openAction} data-type="state">Open</Link>;\n',
      ],
    ]),
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /noisy Link custom attribute work/u);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /data-url/u);
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

test("blocks frontend route TSX work when Scala HTML appears outside the legacy source column only", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | legacy issue list | `frontend/src/routes/$ownerName/$projectName/issues.tsx` mentions `issue/list.scala.html` in implementation prose | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /incomplete audit row work/u);
});

test("blocks frontend route TSX work when the only focused E2E change is deleted", () => {
  const result = evaluateScalaHtmlGoalGuard({
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
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /unverified frontend route work/u);
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

test("blocks frontend route TSX work when the audit row names an unchanged E2E file", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` | `issue/list.scala.html`, `issue/partial_list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issue-detail.e2e.ts` E2E |\n",
    env: {},
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /incomplete audit row work/u);
});

test("blocks multiple frontend goal audit rows in one route commit", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` list branch | `issue/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n" +
      "+| 2026-07-02 | `/admin/sample/issues` search branch | `issue/partial_searchform.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    env: { YONA_ENFORCE_SCALA_HTML_SINGLE_ROW: "1" },
  });

  assert.equal(result.blocked, true);
  assert.match(formatScalaHtmlGoalGuardSummary(result), /multi-screen frontend goal work/u);
});

test("allows explicitly marked multi-screen frontend goal commits", () => {
  const result = evaluateScalaHtmlGoalGuard({
    changedFiles: [
      "frontend/src/routes/$ownerName/$projectName/issues.tsx",
      "frontend/tests/project-issues-empty.e2e.ts",
      "docs/provenance/frontend-scala-html-goal-violation-audit.md",
    ],
    auditPatch:
      "+| 2026-07-02 | `/admin/sample/issues` list branch | `issue/list.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n" +
      "+| 2026-07-02 | `/admin/sample/issues` search branch | `issue/partial_searchform.scala.html` | `frontend/src/routes/$ownerName/$projectName/issues.tsx` rebuild | `frontend/tests/project-issues-empty.e2e.ts` E2E |\n",
    env: {
      YONA_ALLOW_SCALA_HTML_MULTI_SCREEN: "1",
      YONA_ENFORCE_SCALA_HTML_SINGLE_ROW: "1",
    },
  });

  assert.equal(result.blocked, false);
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
