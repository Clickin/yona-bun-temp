import { expect, test } from "@playwright/test";

test("project no-head code preserves runtime owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
        cloneUrl: "https://git.example/sample.git",
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route) =>
    route.fulfill({ contentType: "application/json", json: { noHead: true } }),
  );
  await page.goto(`${basePath}/admin/sample/code`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="project-code-nohead-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-code-nohead-alert"]')).toBeVisible();
});
