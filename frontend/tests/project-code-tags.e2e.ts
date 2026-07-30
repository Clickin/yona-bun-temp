import { expect, test } from "@playwright/test";

test("project code tags renders tags screen and handles tag state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        project: {
          id: 1,
          name: "sample",
          owner: "admin",
          ownerName: "admin",
          projectName: "sample",
          vcs: "GIT",
        },
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.route("**/api/v1/projects/admin/sample/tags", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        body: JSON.stringify({
          noHead: false,
          ownerName: "admin",
          permissions: {
            canCreate: true,
            canDelete: true,
          },
          projectName: "sample",
          tags: [
            {
              commitId: "abcdef1234567890abcdef1234567890abcdef12",
              commitMessage: "Release v1.0.0",
              commitShortId: "abcdef1",
              createdDate: "Jul 1, 2026",
              creatorEmail: "admin@example.com",
              creatorName: "Admin",
              name: "v1.0.0",
              shortName: "v1.0.0",
            },
          ],
        }),
        contentType: "application/json",
        status: 200,
      });
    } else {
      await route.fulfill({
        body: JSON.stringify({
          noHead: false,
          ownerName: "admin",
          permissions: { canCreate: true, canDelete: true },
          projectName: "sample",
          tags: [],
        }),
        contentType: "application/json",
        status: 200,
      });
    }
  });

  await page.goto(`${basePath}/admin/sample/tags`);
  await expect(page).toHaveTitle("Tags - admin/sample");
  await expect(page.locator(".tag-list-wrap tbody tr")).toHaveCount(1);
  await expect(page.locator(".tagName a")).toHaveText("v1.0.0");
  await expect(page.locator(".commit a")).toHaveText("abcdef1");
  await expect(page.locator(".creator")).toContainText("Admin");
  await expect(page.locator(".message")).toHaveText("Release v1.0.0");
});
