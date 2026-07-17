import { expect, test } from "@playwright/test";

test("project code branch preserves legacy browser owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", defaultBranch: "main" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/code/main**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { branch: "main", entries: [], branches: [{ name: "main" }] },
    }),
  );
  await page.goto(`${basePath}/admin/sample/code/main`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="project-code-branch-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-code-branch-browser"]')).toBeVisible();
});
