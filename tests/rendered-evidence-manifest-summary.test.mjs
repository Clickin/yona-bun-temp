import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(
  repoRoot,
  "docs",
  "provenance",
  "ui-parity-reports",
  "2026-06-28-rendered-evidence-execution-manifest.md",
);

test("rendered evidence summary counts match manifest row statuses", () => {
  const source = readFileSync(manifestPath, "utf8");
  assert.doesNotMatch(
    source,
    /frontend\/tests\/(?:issue-detail-parity|board-posting-parity)\.e2e\.ts/,
    "historical detail-route E2E filenames must not be cited as active evidence",
  );
  const summaryCounts = new Map();
  const prioritySummaryCounts = new Map();
  const primaryStatusCounts = new Map();
  const evidenceStatusCounts = new Map();
  const visualMetricClosureStatuses = new Set([
    "visual-layout-metric-guard-passed",
    "targeted-absence-guard-passed",
    "legacy-placeholder-deviation-recorded",
    "no-active-play-caller",
    "targeted-selector-and-inert-template-metric-guard-passed",
    "non-browser-mail-template-recorded",
  ]);
  const userSettingsEvidence = new Map([
    ["user/edit.scala.html", "frontend/tests/user-profile-settings.e2e.ts"],
    ["user/edit_password.scala.html", "frontend/tests/user-password-settings.e2e.ts"],
    ["user/edit_notifications.scala.html", "frontend/tests/user-notification-settings.e2e.ts"],
    ["user/edit_emails.scala.html", "frontend/tests/user-email-settings.e2e.ts"],
    ["user/edit_token.scala.html", "frontend/tests/user-token-settings.e2e.ts"],
  ]);
  const siteAdminEvidence = new Map([
    ["site/data.scala.html", "frontend/tests/site-admin-data.e2e.ts"],
    ["site/diagnostic.scala.html", "frontend/tests/site-admin-diagnostic.e2e.ts"],
    ["site/issueList.scala.html", "frontend/tests/site-admin-issue-list.e2e.ts"],
    ["site/mail.scala.html", "frontend/tests/site-admin-mail.e2e.ts"],
    ["site/massMail.scala.html", "frontend/tests/site-admin-massmail.e2e.ts"],
    ["site/postList.scala.html", "frontend/tests/site-admin-post-list.e2e.ts"],
    ["site/projectList.scala.html", "frontend/tests/site-admin-project-list.e2e.ts"],
    ["site/update.scala.html", "frontend/tests/site-admin-update.e2e.ts"],
    ["site/userList.scala.html", "frontend/tests/site-admin-user-list.e2e.ts"],
  ]);
  const projectPullRequestEvidence = new Map([
    ["git/list.scala.html", "frontend/tests/project-pullrequests.e2e.ts"],
    [
      "git/partial_recently_pushed_branches.scala.html",
      "frontend/tests/project-pullrequests.e2e.ts",
    ],
  ]);
  const projectCodeCommitDetailEvidence = new Map([
    [
      "code/partial_nonrange_codecomment_thread.scala.html",
      "frontend/tests/project-code-commit-detail.e2e.ts",
    ],
    ["code/svnDiff.scala.html", "frontend/tests/project-code-commit-detail.e2e.ts"],
    ["partial_comment_thread.scala.html", "frontend/tests/project-code-commit-detail.e2e.ts"],
    ["partial_diff_comment_on_line.scala.html", "frontend/tests/project-code-commit-detail.e2e.ts"],
    [
      "partial_comment_form_on_thread.scala.html",
      "frontend/tests/project-code-commit-detail.e2e.ts",
    ],
    ["partial_diff_line.scala.html", "frontend/tests/project-code-commit-detail.e2e.ts"],
    ["common/branchItem.scala.html", "frontend/tests/project-code-commit-detail.e2e.ts"],
    ["common/reviewForm.scala.html", "frontend/tests/project-code-commit-detail.e2e.ts"],
  ]);
  const directCurrentEvidence = new Map([
    ["organization/view.scala.html", "frontend/tests/organization-home.e2e.ts"],
    ["common/commitMsg.scala.html", "frontend/tests/project-code-history.e2e.ts"],
  ]);
  let inSummary = false;
  let inPrioritySummary = false;
  let manifestDetailRows;
  let detailRows = 0;
  let visualLayoutMetricsNeeded = 0;

  for (const line of source.split("\n")) {
    const manifestDetailRowsMatch = /^Manifest detail rows: (\d+)$/.exec(line);
    if (manifestDetailRowsMatch) {
      manifestDetailRows = Number(manifestDetailRowsMatch[1]);
      continue;
    }
    if (line.startsWith("## ")) {
      inSummary = false;
      inPrioritySummary = false;
    }
    if (line === "## Evidence Status Summary") {
      inSummary = true;
      continue;
    }
    if (line === "## Priority Coverage Summary") {
      inPrioritySummary = true;
      continue;
    }
    if (inSummary) {
      const match = /^\| ([a-z0-9-]+) \| (\d+) \|/.exec(line);
      if (match) {
        summaryCounts.set(match[1], Number(match[2]));
      }
      continue;
    }
    if (inPrioritySummary) {
      const match = /^\| (P[0-9](?:\/P[0-9])?) \| (\d+) \|/.exec(line);
      if (match) {
        prioritySummaryCounts.set(match[1], Number(match[2]));
      }
      continue;
    }
    if (!line.startsWith("| P")) {
      continue;
    }
    const columns = line
      .split("|")
      .slice(1, -1)
      .map((column) => column.trim().replaceAll("`", ""));
    if (columns.length < 8) {
      continue;
    }
    const priority = columns[0];
    const legacyTemplate = columns[1];
    const primaryStatus = columns[3];
    const evidenceStatus = columns[4];
    const evidenceFiles = columns[6];
    detailRows += 1;
    if (legacyTemplate.startsWith("search/partial_")) {
      assert.match(
        evidenceFiles,
        /frontend\/tests\/search-global\.e2e\.ts/,
        `${legacyTemplate} must cite current global search evidence`,
      );
      assert.doesNotMatch(
        evidenceFiles,
        /frontend\/tests\/search-parity\.e2e\.ts/,
        `${legacyTemplate} must not cite historical search-parity evidence`,
      );
    }
    if (legacyTemplate === "issue/create.scala.html") {
      assert.match(
        evidenceFiles,
        /frontend\/tests\/project-issue-form\.e2e\.ts/,
        "issue/create.scala.html must cite current issue create form evidence",
      );
    }
    if (
      legacyTemplate === "issue/edit.scala.html" ||
      legacyTemplate === "common/calendar.scala.html"
    ) {
      assert.doesNotMatch(
        evidenceFiles,
        /frontend\/tests\/issue-form-parity\.e2e\.ts/,
        `${legacyTemplate} must not cite historical issue-form-parity evidence`,
      );
    }
    const expectedUserSettingsEvidence = userSettingsEvidence.get(legacyTemplate);
    if (expectedUserSettingsEvidence) {
      assert.ok(
        evidenceFiles.includes(expectedUserSettingsEvidence),
        `${legacyTemplate} must cite current user settings evidence`,
      );
      assert.doesNotMatch(
        evidenceFiles,
        /frontend\/tests\/workspace-settings-parity\.e2e\.ts/,
        `${legacyTemplate} must not cite historical workspace settings evidence`,
      );
    }
    if (legacyTemplate === "user/partial_edit_tabmenu.scala.html") {
      for (const expected of userSettingsEvidence.values()) {
        assert.ok(
          evidenceFiles.includes(expected),
          "user/partial_edit_tabmenu.scala.html must cite every current settings tab evidence",
        );
      }
      assert.doesNotMatch(
        evidenceFiles,
        /frontend\/tests\/workspace-settings-parity\.e2e\.ts/,
        "user/partial_edit_tabmenu.scala.html must not cite historical workspace settings evidence",
      );
    }
    const expectedSiteAdminEvidence = siteAdminEvidence.get(legacyTemplate);
    if (expectedSiteAdminEvidence) {
      assert.ok(
        evidenceFiles.includes(expectedSiteAdminEvidence),
        `${legacyTemplate} must cite current site-admin evidence`,
      );
      assert.doesNotMatch(
        evidenceFiles,
        /frontend\/tests\/site-admin-[a-z-]+-parity\.e2e\.ts/,
        `${legacyTemplate} must not cite historical site-admin parity evidence`,
      );
    }
    if (legacyTemplate === "site/siteMngLayout.scala.html") {
      for (const expected of siteAdminEvidence.values()) {
        assert.ok(
          evidenceFiles.includes(expected),
          "site/siteMngLayout.scala.html must cite every current site-admin shell evidence",
        );
      }
      assert.doesNotMatch(
        evidenceFiles,
        /frontend\/tests\/site-admin-[a-z-]+-parity\.e2e\.ts/,
        "site/siteMngLayout.scala.html must not cite historical site-admin parity evidence",
      );
    }
    const expectedProjectPullRequestEvidence = projectPullRequestEvidence.get(legacyTemplate);
    if (expectedProjectPullRequestEvidence) {
      assert.ok(
        evidenceFiles.includes(expectedProjectPullRequestEvidence),
        `${legacyTemplate} must cite current project pull request evidence`,
      );
      assert.doesNotMatch(
        evidenceFiles,
        /frontend\/tests\/pull-request-(?:review-read|interaction)-parity\.e2e\.ts/,
        `${legacyTemplate} must not cite historical pull request parity evidence`,
      );
    }
    const expectedProjectCodeCommitDetailEvidence =
      projectCodeCommitDetailEvidence.get(legacyTemplate);
    if (expectedProjectCodeCommitDetailEvidence) {
      assert.ok(
        evidenceFiles.includes(expectedProjectCodeCommitDetailEvidence),
        `${legacyTemplate} must cite current project code commit detail evidence`,
      );
      assert.doesNotMatch(
        evidenceFiles,
        /frontend\/tests\/project-code-comment-upload-parity\.e2e\.ts/,
        `${legacyTemplate} must not cite historical code comment upload parity evidence`,
      );
    }
    const expectedDirectCurrentEvidence = directCurrentEvidence.get(legacyTemplate);
    if (expectedDirectCurrentEvidence) {
      assert.ok(
        evidenceFiles.includes(expectedDirectCurrentEvidence),
        `${legacyTemplate} must cite current direct evidence`,
      );
      assert.doesNotMatch(
        evidenceFiles,
        /frontend\/tests\/(?:organization-directory-admin-parity|code-parity)\.e2e\.ts/,
        `${legacyTemplate} must not cite historical broad parity evidence`,
      );
    }
    prioritySummaryCounts.set(
      `__actual:${priority}`,
      (prioritySummaryCounts.get(`__actual:${priority}`) ?? 0) + 1,
    );
    primaryStatusCounts.set(primaryStatus, (primaryStatusCounts.get(primaryStatus) ?? 0) + 1);
    evidenceStatusCounts.set(evidenceStatus, (evidenceStatusCounts.get(evidenceStatus) ?? 0) + 1);
    if (!visualMetricClosureStatuses.has(evidenceStatus)) {
      visualLayoutMetricsNeeded += 1;
    }
  }

  assert.equal(manifestDetailRows, detailRows, "manifest detail row count drifted");
  for (const status of [
    "targeted-absence-guard-passed",
    "intentional-deviation-recorded",
    "non-browser-mail-template-recorded",
  ]) {
    assert.equal(
      summaryCounts.get(status),
      primaryStatusCounts.get(status),
      `${status} count drifted`,
    );
  }
  assert.equal(
    summaryCounts.get("visual-layout-metric-guard-passed"),
    evidenceStatusCounts.get("visual-layout-metric-guard-passed"),
    "visual-layout-metric-guard-passed count drifted",
  );
  assert.equal(
    summaryCounts.get("visual-layout-metrics-needed"),
    visualLayoutMetricsNeeded,
    "visual-layout-metrics-needed count drifted",
  );
  for (const priority of ["P0", "P1", "P2/P3"]) {
    assert.equal(
      prioritySummaryCounts.get(priority),
      prioritySummaryCounts.get(`__actual:${priority}`),
      `${priority} count drifted`,
    );
  }
});
