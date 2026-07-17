import { expect, test } from "@playwright/test";

test("project search preserves legacy result owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/search**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { counts: {}, items: [], pageNum: 1, totalPages: 1 },
    }),
  );
  await page.goto(`${basePath}/admin/sample/search`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="project-search-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-search-results"]')).toBeVisible();
});
