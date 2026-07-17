import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync(
  "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
  "utf8",
);
const styleSource = readFileSync(
  "src/routes/$ownerName/$projectName/pullRequest/-pull-request-detail.stylex.ts",
  "utf8",
);
const legacyPartial = readFileSync(
  "../yona-original/app/views/git/partial_info.scala.html",
  "utf8",
);

test("pull request detail owns static author and reviewer spacing in StyleX", async ({ page }) => {
  expect(legacyPartial).toContain('style="display:inline-block; margin-right:5px;"');
  expect(legacyPartial).toContain(
    'style="font-size: 13px; vertical-align: middle; margin: 0 10px;"',
  );
  expect(routeSource).toContain('data-stylex-owner="pull-request-detail-author"');
  expect(routeSource).toContain('data-stylex-owner="pull-request-detail-reviewers"');
  expect(routeSource).toContain('data-stylex-owner="pull-request-detail-reviewer-summary"');
  expect(routeSource).not.toContain('style={{ marginTop: "20px" }}');
  expect(routeSource).not.toContain('style={{ display: "inline-block", marginRight: "5px" }}');
  expect(styleSource).toContain(
    'author: { color: pullRequestDetailColors.accentText, marginTop: "20px" }',
  );
  expect(styleSource).toContain('reviewers: { display: "inline-block", marginRight: "5px" }');
  expect(styleSource).toContain(
    'reviewerSummary: { fontSize: "13px", verticalAlign: "middle", margin: "0 10px" }',
  );
  await mockDetail(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/1`);

    const author = page.locator('[data-stylex-owner="pull-request-detail-author"]');
    const reviewers = page.locator('[data-stylex-owner="pull-request-detail-reviewers"]');
    const summary = page.locator('[data-stylex-owner="pull-request-detail-reviewer-summary"]');
    await expect(author).toHaveCSS("margin-top", "20px");
    await expect(reviewers).toHaveCSS("display", "inline-block");
    await expect(reviewers).toHaveCSS("margin-right", "5px");
    await expect(summary).toHaveCSS("font-size", "13px");
    await expect(summary).toHaveCSS("vertical-align", "middle");
    await expect(summary).toHaveCSS("margin-top", "0px");
    await expect(summary).toHaveCSS("margin-right", "10px");
    await expect(page.locator("#reviewers")).toContainText("1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  }
});

async function mockDetail(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, loginId: "admin", userLabel: "Site Admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        isUsingReviewerCount: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/1", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        bodyMarkdown: "Pull request body",
        commits: [],
        conflict: false,
        contributor: { avatarUrl: "", loginId: "dev", userId: 2, userLabel: "Dev Member" },
        createdLabel: "Jul 2, 2026",
        events: [],
        fromBranch: "feature/ui",
        fromOwnerName: "admin",
        fromProjectName: "sample",
        id: 1,
        isMerging: false,
        isWatching: false,
        lackingReviewerCount: 0,
        mergedCommitIdFrom: "",
        mergedCommitIdTo: "",
        ownerName: "admin",
        permissions: {
          canComment: true,
          canDeleteSourceBranch: false,
          canRead: true,
          canReadChanges: true,
          canReview: true,
          canRestoreSourceBranch: false,
          canUpdate: true,
          canUpdateState: true,
          canWatch: true,
        },
        projectName: "sample",
        pullRequestNumber: 1,
        receiver: { avatarUrl: "", loginId: "admin", userId: 1, userLabel: "Site Admin" },
        requiredReviewerCount: 1,
        reviewed: false,
        reviewers: [{ avatarUrl: "", loginId: "reviewer", userId: 3, userLabel: "Reviewer" }],
        sourceBranchExists: true,
        state: "open",
        threads: [],
        title: "Improve docs",
        toBranch: "main",
        updatedLabel: "Jul 2, 2026",
        watcherCount: 0,
      },
    }),
  );
}
