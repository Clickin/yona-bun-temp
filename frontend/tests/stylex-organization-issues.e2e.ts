import { expect, test } from "@playwright/test";

test("organization issues preserves legacy list and quick-search owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", json: { actorId: 1, isAnonymous: false } }),
  );
  await page.route("**/api/v1/organizations/weblabs/issues**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        openIssueCount: 1,
        items: [
          {
            id: "1",
            issueNumber: "1",
            title: "Fix login",
            ownerName: "weblabs",
            projectName: "sample",
            labels: [],
            state: "open",
          },
        ],
        organizationName: "weblabs",
        pageNum: 1,
        totalPages: 1,
        visibleProjects: [{ ownerName: "weblabs", projectName: "sample" }],
      },
    }),
  );
  await page.goto(`${basePath}/organizations/weblabs/issues`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="organization-issues-list"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="organization-issues-search"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="organization-issues-results"]')).toBeVisible();
  await expect(page.getByText("Fix login")).toBeVisible();
});
