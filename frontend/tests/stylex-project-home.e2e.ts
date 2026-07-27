import { expect, test } from "@playwright/test";

test("project home preserves runtime shell owner", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        vcs: "GIT",
        cloneUrl: "https://example.com/admin/sample.git",
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          pullRequests: [],
          noMilestoneOpenIssueCount: 0,
          unassignedOpenIssueCount: 0,
        },
        history: { items: [] },
        members: [],
        menuSetting: { issue: true, pullRequest: true },
        viewerCanUpdate: true,
      },
    }),
  );
  await page.goto(`${basePath}/admin/sample`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="project-home-page"]')).toBeVisible();
});
