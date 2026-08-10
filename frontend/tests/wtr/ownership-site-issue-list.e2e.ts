import { expect, test } from "../wtr-compat.ts";

test("site issue list preserves runtime owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
      },
    }),
  );
  await page.route("**/api/v1/site/issues?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { issues: [], page: 1, pageSize: 20, state: "open", total: 0, totalPages: 1 },
    }),
  );
  await page.goto(`${basePath}/sites/issueList`, { waitUntil: "commit" });
  await expect(page.locator('[data-owner="site-issue-list-page-wrap-outer"]')).toBeVisible();
  await expect(page.locator('[data-owner="site-issue-list-title-heading"]')).toBeVisible();
});
