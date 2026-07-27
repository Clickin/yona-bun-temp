import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "en-US" });

test("moves static spacing and dynamic review progress into StyleX", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/pullRequests.tsx", "utf8");
  const stylex = readFileSync(
    "src/routes/$ownerName/$projectName/-pull-requests.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/git/partial_list.scala.html", "utf8");
  const pushedTemplate = readFileSync(
    "../yona-original/app/views/git/partial_recently_pushed_branches.scala.html",
    "utf8",
  );
  expect(template).toContain('style="margin-right:10px;"');
  expect(pushedTemplate).toContain('style="margin-left:5px;font-weight:bold;"');
  expect(route).toContain('data-stylex-owner="project-pullrequests-review-progress"');
  expect(route).toContain('data-stylex-owner="project-pullrequests-reviewer-count"');
  expect(route).toContain('data-stylex-owner="project-pullrequests-pushed-branch"');
  expect(route).toContain("sx.reviewProgressBar(`${percent}%`)");
  expect(route).not.toContain("style={{ width: `${percent}%` }}");
  expect(route).not.toContain("style={{ paddingTop: 0");
  expect(route).not.toContain("style={{ marginRight: 10 }}");
  expect(route).not.toContain("style={{ marginTop: -1 }}");
  expect(stylex).toContain('recentlyPushedBranch: { fontWeight: "700", marginLeft: "5px" }');
  expect(stylex).toContain('reviewProgressItem: { marginRight: "10px" }');
  expect(stylex).toContain('reviewerCount: { marginTop: "-1px" }');

  await mockPopulatedPullRequests(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequests?filter=row`);
    await expect(owner(page, "project-pullrequests-search-column")).toHaveCSS("padding-top", "0px");
    const progress = owner(page, "project-pullrequests-review-progress");
    const progressFill = owner(page, "project-pullrequests-review-progress-fill");
    const reviewer = owner(page, "project-pullrequests-reviewer-count");
    const pushed = owner(page, "project-pullrequests-pushed-branch");
    await expect(progress).toBeVisible();
    await expect(progress).toHaveCSS("margin-right", "10px");
    await expect(progressFill).toHaveCSS("width", "15px");
    const inlineStyle = await progressFill.getAttribute("style");
    expect(inlineStyle).toContain("--x-width: 50%");
    expect(inlineStyle).not.toMatch(/(?:^|;)\s*width\s*:/u);
    await expect(reviewer).toHaveCSS("margin-top", "-1px");
    await expect(pushed).toHaveCount(0);
    await expect(owner(page, "project-pullrequests-rows")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

    await page.goto(`${basePath}/admin/sample/pullRequests?filter=pushed`);
    await expect(owner(page, "project-pullrequests-pushed-branch")).toHaveCSS("margin-left", "5px");
    await expect(owner(page, "project-pullrequests-pushed-branch")).toHaveCSS("font-weight", "700");
  }
});

async function mockPopulatedPullRequests(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        defaultBranch: "main",
        isUsingReviewerCount: true,
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests**", (route: Route) => {
    const filter = new URL(route.request().url()).searchParams.get("filter");
    route.fulfill({
      contentType: "application/json",
      json: {
        category: "open",
        closedCount: 0,
        contributors: [],
        currentUserId: 1,
        items:
          filter === "pushed"
            ? []
            : [
                {
                  closedCommentThreadCount: 1,
                  commentThreadCount: 2,
                  conflict: false,
                  contributorLabel: "Dev Member",
                  contributorLoginId: "dev",
                  createdLabel: "Jul 1, 2026",
                  fromBranch: "feature/api",
                  fromOwnerName: "dev",
                  fromProjectName: "sample",
                  id: 77,
                  ownerName: "admin",
                  projectName: "sample",
                  pullRequestNumber: 7,
                  receiverLabel: "Site Admin",
                  receiverLoginId: "admin",
                  reviewerCount: 2,
                  reviewerNames: ["Site Admin"],
                  state: "open",
                  title: "Restore PR rows",
                  toBranch: "main",
                  updatedLabel: "Jul 1, 2026",
                },
              ],
        openCount: 1,
        pageNum: 1,
        pageSize: 20,
        recentlyPushedBranches:
          filter === "pushed"
            ? [
                {
                  branchName: "refs/heads/feature/api",
                  defaultBranch: "main",
                  id: 9,
                  ownerName: "admin",
                  projectName: "sample",
                  pushedLabel: "today",
                  shortName: "feature/api",
                },
              ]
            : [],
        sentCount: 0,
        totalCount: 1,
      },
    });
  });
}
