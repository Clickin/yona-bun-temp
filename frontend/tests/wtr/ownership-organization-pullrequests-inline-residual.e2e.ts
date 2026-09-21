import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test.use({ locale: "en-US" });

test("moves static review progress spacing and dynamic width into Style", async ({ page }) => {
  const route = readFileSync("src/routes/organizations/$organizationName/pullrequests.tsx", "utf8");

  const template = readFileSync(
    "../yona-original/app/views/organization/group_pullrequest_list_partial.scala.html",
    "utf8",
  );
  expect(template).toContain('style="margin-right:20px;"');
  expect(route).toContain('data-owner="organization-pullrequests-row-progress"');
  expect(route).toContain('data-owner="organization-pullrequests-row-progress-track"');

  await mockPopulatedPullRequests(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/pullrequests`);
    const progress = owner(page, "organization-pullrequests-row-progress");
    const progressTrack = owner(page, "organization-pullrequests-row-progress-track");
    const progressFill = owner(page, "organization-pullrequests-row-progress-fill");
    await expect(progress).toBeVisible();
    await expect(progressTrack).toHaveCSS("display", "inline-block");
    await expect(progressTrack).toHaveCSS("width", "30px");
    await expect(progressTrack).toHaveCSS("vertical-align", "middle");
    await expect(progressTrack).toHaveCSS("overflow", "hidden");
    await expect(progressTrack).toHaveCSS("margin-top", "3px");
    await expect(progressTrack).toHaveCSS("border-radius", "5px");
    await expect(progress).toHaveCSS("margin-right", "20px");
    await expect(progressFill).toHaveCSS("height", "7px");
    await expect(progressFill).toHaveCSS("width", "15px");
    const inlineStyle = await progressFill.getAttribute("style");

    expect(inlineStyle).not.toMatch(/(?:^|;)\s*width\s*:/u);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
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
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { organizationName: "weblabs", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/pull-requests**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        category: "open",
        closedCount: 0,
        items: [
          {
            closedCommentThreadCount: 1,
            commentThreadCount: 2,
            conflict: false,
            contributorLabel: "Dev Member",
            contributorLoginId: "dev",
            createdLabel: "Jul 1, 2026",
            fromBranch: "feature",
            fromOwnerName: "dev",
            fromProjectName: "sample",
            id: 3,
            ownerName: "weblabs",
            projectName: "sample",
            pullRequestNumber: 3,
            receiverLabel: "Site Admin",
            receiverLoginId: "admin",
            reviewerCount: 0,
            reviewerNames: [],
            state: "OPEN",
            title: "Fix login redirect",
            toBranch: "main",
            updatedLabel: "Jul 1, 2026",
          },
        ],
        openCount: 1,
        pageNum: 1,
        pageSize: 20,
        recentlyPushedBranches: [],
        sentCount: 0,
        totalCount: 1,
      },
    }),
  );
}
