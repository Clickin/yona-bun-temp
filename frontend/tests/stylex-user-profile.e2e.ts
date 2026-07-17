import { expect, test } from "@playwright/test";

test("public user profile renders legacy info and stream owners", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          loginId: "admin",
          displayName: "Admin",
          englishName: "Admin",
          avatarUrl: "",
          primaryEmailAddress: "",
          sinceLabel: "2026-01-01",
          isGuest: false,
          isBlocked: false,
          isSiteAdmin: false,
          connectedSocialProviders: [],
        },
        issueItems: [
          {
            id: 1,
            number: 1,
            title: "Sample issue",
            state: "open",
            projectOwnerName: "admin",
            projectName: "sample",
            authorLoginId: "admin",
            authorLabel: "Admin",
            createdLabel: "today",
            labels: [],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
  await page.goto("/yona/admin");
  await expect(page.locator('[data-stylex-owner="user-profile-box"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-info"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-stream"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="user-profile-tabs"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-stylex-owner="user-profile-box"]')).toBeVisible();
  const width = await page.locator('[data-stylex-owner="user-profile-box"]').evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(width.width).toBeGreaterThan(0);
  expect(width.scrollWidth).toBe(390);
});
