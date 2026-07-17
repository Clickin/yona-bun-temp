import { expect, test } from "@playwright/test";

test("project posts preserves legacy list and search owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
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
        showBoard: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [],
        notices: [],
        totalCount: 0,
        pageNum: 1,
        totalPages: 1,
        pageSize: 20,
        openIssueCount: 0,
        closedIssueCount: 0,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: false,
        canMarkNotice: true,
        canMarkReadme: false,
        labels: [],
        defaultPermissions: {
          canAttachFiles: false,
          canCreate: true,
          canMarkNotice: true,
          canMarkReadme: false,
        },
      },
    }),
  );
  await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="project-posts-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-posts-search"]')).toBeVisible();
});
