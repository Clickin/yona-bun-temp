import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("organization home preserves the legacy project info float", async ({ page }) => {
  await mockOrganizationHome(page);
  await page.goto(`${basePath}/organizations/weblabs`, { waitUntil: "domcontentloaded" });

  const projectInfo = page.locator('[data-owner="organization-home-project-info"]');
  await expect(projectInfo).toHaveCount(1);
  await expect(projectInfo).toHaveCSS("float", "left");
  await expect(projectInfo.locator(".header")).toContainText("sample");

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(398);
});

async function mockOrganizationHome(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        description: "Web labs group",
        logoUrl: "",
        viewerCanCreateProject: true,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [
          {
            ownerName: "weblabs",
            projectName: "sample",
            overview: "Sample project",
            projectScope: "PUBLIC",
            createdAt: "2020-01-02T12:00:00Z",
            lastPushedAt: "",
            members: [],
            labels: [],
          },
        ],
        adminMembers: [],
        memberMembers: [],
      },
    }),
  );
}
