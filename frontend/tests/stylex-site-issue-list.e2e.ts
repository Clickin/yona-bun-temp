import { expect, test } from "@playwright/test";

test("site issue list preserves runtime owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/sites/issues**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { items: [], totalCount: 0, totalPages: 1, pageNum: 1 },
    }),
  );
  await page.goto(`${basePath}/sites/issueList`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="site-issue-list-page-wrap-outer"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="site-issue-list-title-heading"]')).toBeVisible();
});
