import { expect, test } from "../wtr-compat.ts";
// Batch 1120: verify branch code search UI

test("project code search find file and grep in file UI with stylex", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
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
    });
  });

  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        logoImageUrl: "",
        menu: {
          activeMenu: "code",
          canAccessCode: true,
          canAccessIssues: true,
          canAccessPullRequests: true,
        },
        organizationName: null,
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    });
  });

  await page.route("**/api/v1/projects/admin/sample**", async (route) => {
    const url = route.request().url();
    if (url.includes("/find")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          ownerName: "admin",
          paths: ["src/main.rs", "src/lib.rs", "README.md"],
          projectName: "sample",
          query: "src",
          selectedBranch: "main",
        },
        status: 200,
      });
      return;
    }
    if (url.includes("/grep")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          matches: [
            {
              content: "fn main() {",
              lineNumber: 10,
              path: "src/main.rs",
            },
          ],
          ownerName: "admin",
          projectName: "sample",
          query: "main",
          selectedBranch: "main",
        },
        status: 200,
      });
      return;
    }
    if (url.includes("/code")) {
      await route.fulfill({
        contentType: "application/json",
        json: {
          branches: [{ name: "main" }],
          breadcrumbs: [],
          entries: [
            {
              commitDate: "2026-07-30T00:00:00Z",
              commitMessage: "initial commit",
              commitShortId: "abc1234",
              kind: "file",
              name: "README.md",
              path: "README.md",
              size: 100,
            },
          ],
          noHead: false,
          ownerName: "admin",
          path: "",
          projectName: "sample",
          selectedBranch: "main",
        },
        status: 200,
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
      status: 200,
    });
  });

  await page.goto(`${basePath}/admin/sample/code/main`);

  // Check code search panel exists
  const panel = page.locator("[data-testid='code-search-panel']");
  await expect(panel).toBeVisible();

  // Test Find File
  const findTab = page.locator("[data-testid='code-search-tab-find']");
  await expect(findTab).toBeVisible();
  await findTab.click();

  const searchInput = page.locator("[data-testid='code-search-input']");
  await searchInput.fill("src");
  await page.locator("[data-testid='code-search-submit']").click();

  const findResults = page.locator("[data-testid='code-search-find-results']");
  await expect(findResults).toBeVisible();
  await expect(page.locator("[data-testid='code-search-result-item']")).toHaveCount(3);

  // Test Search in File (grep)
  const grepTab = page.locator("[data-testid='code-search-tab-grep']");
  await expect(grepTab).toBeVisible();
  await grepTab.click();

  await searchInput.fill("main");
  await page.locator("[data-testid='code-search-submit']").click();

  const grepResults = page.locator("[data-testid='code-search-grep-results']");
  await expect(grepResults).toBeVisible();
  await expect(page.locator("[data-testid='code-search-result-item']")).toHaveCount(1);
  await expect(grepResults).toContainText("fn main()");
});
