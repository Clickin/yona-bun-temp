import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("organization profile owns the server logo background with Dynamic StyleX", async ({
  page,
}) => {
  const source = readFileSync("src/routes/organizations/$organizationName.tsx", "utf8");
  const styleSource = readFileSync("src/routes/organizations/-organization-home.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/organization/header.scala.html", "utf8");

  expect(legacy).toContain(
    '<div class="project-header-outer" style="background-image:url(\'@urlToOrganizationLogo(org)\')">',
  );
  expect(source).toContain('data-stylex-owner="organization-profile-header-background"');
  expect(source).not.toContain("style={{ backgroundImage:");
  expect(source).toContain("styles.headerBackground");
  expect(styleSource).toContain("headerBackground: (backgroundImage: string)");

  await mockOrganization(page);
  await page.goto(`${basePath}/organizations/weblabs`, { waitUntil: "domcontentloaded" });

  const header = page.locator('[data-stylex-owner="organization-profile-header-background"]');
  await expect(header).toHaveCount(1);
  await expect(header).toHaveCSS("background-image", /organization-profile\.png/u);
  await expect(header).toHaveAttribute("style", /--x-backgroundImage:\s*url\('/u);
  await expect(header.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    "/assets/images/organization-profile.png",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const geometry = await header.evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.documentWidth).toBe(geometry.viewportWidth);
});

async function mockOrganization(page: Page) {
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
        logoUrl: "/assets/images/organization-profile.png",
        viewerCanCreateProject: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
        adminMembers: [],
        memberMembers: [],
      },
    }),
  );
}
