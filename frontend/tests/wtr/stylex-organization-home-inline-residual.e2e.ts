import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = "src/routes/organizations/$organizationName.tsx";

test("organization home moves the project info float into a StyleX owner", async ({ page }) => {
  const source = readFileSync(routeSource, "utf8");
  const stylexSource = readFileSync(
    "src/routes/organizations/-organization-home.stylex.ts",
    "utf8",
  );
  const legacyTemplate = readFileSync(
    "../yona-original/app/views/organization/view.scala.html",
    "utf8",
  );

  expect(legacyTemplate).toContain('<div style="float:left">');
  expect(source).toContain('data-stylex-owner="organization-home-project-info"');
  expect(source).not.toContain('<div style={{ float: "left" }}>');
  expect(stylexSource).toContain('projectInfo: { float: "left" }');

  await mockOrganizationHome(page);
  await page.goto(`${basePath}/organizations/weblabs`, { waitUntil: "domcontentloaded" });

  const projectInfo = page.locator('[data-stylex-owner="organization-home-project-info"]');
  await expect(projectInfo).toHaveCount(1);
  await expect(projectInfo).toHaveCSS("float", "left");
  expect(await projectInfo.getAttribute("style")).toBeNull();
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
            createdLabel: "today",
            labels: [],
          },
        ],
        adminMembers: [],
        memberMembers: [],
      },
    }),
  );
}
