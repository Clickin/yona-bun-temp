import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/branches.tsx", import.meta.url),
  "utf8",
);

test("project branches owns the legacy tabs inline residual in route StyleX", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockBranches(page);
  await page.goto(`${basePath}/admin/sample/branches`);

  const tabs = page.locator('[data-stylex-owner="project-branches-tabs"]');
  await expect(tabs).toHaveCount(1);
  await expect(tabs).toHaveClass(/nav-tabs/u);
  await expect(tabs).toHaveCSS("margin-bottom", "20px");
  await expect(tabs).not.toHaveAttribute("style", /margin-bottom/u);
  await expect(page.locator('[data-stylex-owner="project-branches-table"]')).toHaveCount(1);
  await expect(page.locator("[data-toggle], [data-placement], [data-request-method]")).toHaveCount(
    0,
  );

  const metrics = await tabs.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    right: element.getBoundingClientRect().right,
    viewport: window.innerWidth,
  }));
  expect(metrics.right).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.width).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileMetrics = await page
    .locator('[data-stylex-owner="project-branches-tabs"]')
    .evaluate((element) => ({
      right: element.getBoundingClientRect().right,
      viewport: window.innerWidth,
    }));
  expect(mobileMetrics.right).toBeLessThanOrEqual(mobileMetrics.viewport);

  expect(SOURCE).not.toContain('style={{ marginBottom: "20px" }}');
  expect(SOURCE).toContain('data-stylex-owner="project-branches-tabs"');
});

async function mockBranches(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        openIssueCount: 1,
        openPullRequestCount: 1,
        organizationName: "",
        ownerName: "admin",
        postCount: 1,
        projectName: "sample",
        projectScope: "public",
        reviewCount: 1,
        vcs: "GIT",
        viewerCanUpdate: true,
        watchingCount: 2,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [
          {
            commitDate: "Jul 1, 2026",
            commitId: "abcdef1234567890",
            commitShortId: "abcdef1",
            isDefault: true,
            name: "main",
            shortName: "main",
            pullRequest: null,
          },
        ],
        defaultBranch: "refs/heads/main",
        noHead: false,
        ownerName: "admin",
        permissions: { canDelete: true, canUpdate: true },
        projectName: "sample",
      }),
    });
  });
}
