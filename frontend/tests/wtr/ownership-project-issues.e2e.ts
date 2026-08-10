import { expect, test } from "../wtr-compat.ts";

test("project issues preserves list owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        isAnonymous: false,
        loginId: "admin",
        userLabel: "Admin",
        isSiteAdmin: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        vcs: "GIT",
        viewerCanUpdate: true,
        showIssue: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [],
        visibleProjects: [],
        state: "open",
        orderBy: "updatedDate",
        orderDir: "desc",
        totalCount: 0,
        pageNum: 1,
        totalPages: 1,
        openIssueCount: 0,
        closedIssueCount: 0,
      },
    }),
  );
  for (const suffix of ["milestones", "labels", "assignable-users", "issue-search-users"]) {
    await page.route(`**/api/v1/owners/admin/projects/sample/${suffix}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { items: [], milestones: [], labels: [], users: [] },
      }),
    );
  }
  await page.goto(`${basePath}/admin/sample/issues`, { waitUntil: "commit" });
  await expect(page.locator('[data-content-ready="true"]')).toHaveCount(1);
  await expect(page.locator('[data-content-ready="true"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-issues-page"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-issues-results"]')).toBeVisible();
});
