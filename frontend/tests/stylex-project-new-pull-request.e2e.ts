import { expect, test } from "@playwright/test";

test("new pull request form preserves legacy owner boundaries", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pullRequests/form-options**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { commits: [], branches: [], canCreate: true },
    }),
  );
  await page.goto(`${basePath}/admin/sample/newPullRequestForm`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="new-pull-request-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="new-pull-request-form"]')).toBeVisible();
});
