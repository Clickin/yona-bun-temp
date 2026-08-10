import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = "src/routes/organizations/$organizationName/members.tsx";

test("organization members moves residual inline actions into colocated Style owners", async ({
  page,
}) => {
  const source = readFileSync(routeSource, "utf8");
  expect(source).toContain('data-owner="organization-members-suggestion-action"');
  expect(source).toContain('detailsOwner="organization-members-enrollment-details"');

  await mockMembers(page);
  await page.goto(`${basePath}/organizations/weblabs/members`, { waitUntil: "domcontentloaded" });

  const enrollmentDetails = page.locator('[data-owner="organization-members-enrollment-details"]');
  await expect(enrollmentDetails).toHaveCount(1);
  await expect(enrollmentDetails).toHaveCSS("width", "60px");

  const input = page.locator("#loginId");
  await input.fill("car");
  const action = page.locator('[data-owner="organization-members-suggestion-action"]');
  await expect(action).toBeVisible();
  await expect(action).toHaveCSS("display", "block");
  await expect(action).toHaveCSS("padding", "3px 20px");
  await expect(action).toHaveCSS("text-align", "left");

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(398);
});

async function mockMembers(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfillSession);

  await page.route("**/api/v1/organizations/weblabs/admin", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        deleteAllowed: true,
        enrollmentRequests: [{ avatarUrl: "", loginId: "bob", userId: 3, userLabel: "Bob Smith" }],
        id: 42,
        logoUrl: "",
        members: [],
        organizationName: "weblabs",
        roleOptions: [{ label: "Group Manager", role: "org_admin" }],
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        visibleProjects: [],
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Web labs group",
        id: 42,
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/-_-api/v1/users?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: [
        {
          info: '<img src="/assets/images/default-avatar-64.png"><b class="mention_name">Carol Jones</b><span class="mention_username">@carol</span>',
          loginId: "carol",
        },
      ],
    }),
  );
}
