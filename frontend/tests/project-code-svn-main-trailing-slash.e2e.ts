import { expect, test, type Page } from "@playwright/test";

test("svn main trailing slash replaces to the canonical legacy folder URL", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSvnMainFolder(page);

  await page.goto(`${basePath}/admin/svnplayground/code/main?previous=1`);
  await expect(page.locator(".code-browse-wrap")).toBeVisible();

  await page.goto(`${basePath}/admin/svnplayground/code/main/?probe=1#fragment`);
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/code/main`);
  await expect(page.locator(".code-browse-wrap > .nav.nav-tabs > li")).toHaveCount(2);
  await expect(page.locator(".list-wrap > .alert.alert-warning")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/code/main?previous=1`);
});

async function mockSvnMainFolder(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/svnplayground/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 8,
        isPrivate: false,
        isProtected: false,
        menuSetting: { board: true, code: true, issue: true, milestone: true, review: true },
        ownerName: "admin",
        projectName: "svnplayground",
        vcs: "SVN",
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/svnplayground/code**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "HEAD" }],
        breadcrumbs: [],
        entries: [],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "svnplayground",
        selectedBranch: "main",
      }),
    });
  });
}
