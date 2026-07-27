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
const legacyRoot = readFileSync("../yona-original/app/views/git/view.scala.html", "utf8");
const appCss = readFileSync("src/app.css", "utf8");
const legacyCommon = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_common.less",
  "utf8",
);

test("pull request detail owns static author and reviewer spacing in StyleX", async ({ page }) => {
  expect(legacyPartial).toContain('style="display:inline-block; margin-right:5px;"');
  expect(legacyRoot).toContain('<div class="author-info left-txt"');
  expect(legacyCommon).toContain(".left-txt      { text-align:left;  }");
  expect(appCss).not.toContain(".left-txt {");
  expect(legacyRoot).toContain('<div class="mr5" style="display:inline-block;">');
  expect(legacyPartial).toContain(
    'style="font-size: 13px; vertical-align: middle; margin: 0 10px;"',
  );
  expect(routeSource).toContain('data-stylex-owner="pull-request-detail-author"');
  expect(routeSource).toContain('data-stylex-owner="pull-request-detail-reviewers"');
  expect(routeSource).toContain('data-stylex-owner="pull-request-detail-reviewer-summary"');
  expect(routeSource).toContain('data-stylex-owner="pull-request-detail-action-wrapper"');
  expect(routeSource).not.toContain('style={{ marginTop: "20px" }}');
  expect(routeSource).not.toContain('style={{ display: "inline-block", marginRight: "5px" }}');
  expect(routeSource).not.toContain('style={{ display: "inline-block" }}');
  expect(styleSource).toContain("color: pullRequestDetailColors.accentText");
  expect(styleSource).toContain('textAlign: "left"');
  expect(routeSource).not.toContain("author-info left-txt");
  expect(styleSource).toContain('reviewers: { display: "inline-block", marginRight: "5px" }');
  expect(styleSource).toContain(
    'reviewerSummary: { fontSize: "13px", verticalAlign: "middle", margin: "0 10px" }',
  );
  expect(styleSource).toContain('actionWrapper: { display: "inline-block" }');
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
    const actionWrapper = page.locator('[data-stylex-owner="pull-request-detail-action-wrapper"]');
    await expect(author).toHaveCSS("margin-top", "20px");
    await expect(author).toHaveCSS("text-align", "left");
    await expect(reviewers).toHaveCSS("display", "inline-block");
    await expect(reviewers).toHaveCSS("margin-right", "5px");
    await expect(summary).toHaveCSS("font-size", "13px");
    await expect(summary).toHaveCSS("vertical-align", "middle");
    await expect(summary).toHaveCSS("margin-top", "0px");
    await expect(summary).toHaveCSS("margin-right", "10px");
    // The wrapper owns the legacy inline-block declaration; as a flex item its
    // browser-computed outer display is block while preserving the same action row geometry.
    await expect(actionWrapper).toHaveCSS("display", "block");
    await expect(actionWrapper).toHaveCSS("margin-right", "5px");
    await expect(actionWrapper).toContainText("Edit");
    await expect(actionWrapper).toContainText("Close");
    const actions = page.locator('[data-stylex-owner="pull-request-detail-actions"]');
    const actionBox = await actionWrapper.boundingBox();
    const actionsBox = await actions.boundingBox();
    expect(actionBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect(actionBox!.x).toBeGreaterThanOrEqual(actionsBox!.x);
    expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(actionsBox!.x + actionsBox!.width);
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
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
