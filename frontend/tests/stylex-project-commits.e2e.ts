import { expect, test } from "@playwright/test";

test("project commits preserves legacy history owner", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", defaultBranch: "main" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/commits**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { branches: [{ name: "main" }], commits: [], pageNum: 1, totalPages: 1 },
    }),
  );
  await page.goto(`${basePath}/admin/sample/commits`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="project-commits-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-commits-history"]')).toBeVisible();
});
