import { expect, test } from "@playwright/test";

test("project posts preserves legacy list and search owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/posts**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { items: [], totalCount: 0, pageNum: 1, totalPages: 1, pageSize: 20 },
    }),
  );
  await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="project-posts-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-posts-search"]')).toBeVisible();
});
