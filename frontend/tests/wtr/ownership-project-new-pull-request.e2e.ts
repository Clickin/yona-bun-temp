import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("new pull request form preserves legacy owner boundaries", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/newPullRequestForm.tsx",
    "utf8",
  );
  expect(routeSource).toContain('data-content-ready="false"');
  expect(routeSource).toContain('data-content-ready="true"');
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/form-options**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { commits: [], branches: [], canCreate: true },
    }),
  );
  await page.goto(`${basePath}/admin/sample/newPullRequestForm`, { waitUntil: "commit" });
  await expect(page.locator('[data-content-ready="true"]')).toHaveCount(1);
  await expect(page.locator('[data-content-ready="true"]')).toBeVisible();
  await expect(page.locator('[data-owner="new-pull-request-page"]')).toBeVisible();
  await expect(page.locator('[data-owner="new-pull-request-form"]')).toBeVisible();
});
