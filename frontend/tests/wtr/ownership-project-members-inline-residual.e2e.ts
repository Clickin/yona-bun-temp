import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project members moves residual inline actions into colocated Style owners", async ({
  page,
}) => {
  await mockMembers(page);
  await page.goto(`${basePath}/admin/sample/members`, { waitUntil: "domcontentloaded" });

  const enrollmentDetails = page.locator('[data-owner="project-members-enrollment-details"]');
  await expect(enrollmentDetails).toHaveCSS("width", "60px");

  const input = page.locator("#loginId");
  await input.fill("car");
  const action = page.locator('[data-owner="project-members-suggestion-action"]');
  await expect(action).toBeVisible();
  await expect(action).toHaveCSS("display", "block");
  await expect(action).toHaveCSS("padding", "3px 20px");
  await expect(action).toHaveCSS("text-align", "left");

  await page.setViewportSize({ width: 390, height: 844 });
  const viewport = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(viewport.documentWidth).toBeLessThanOrEqual(viewport.viewportWidth + 8);
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
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", json: session }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-members" },
      json: { isAuthenticated: true, user: session },
    }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ contentType: "application/json", json: session }),
  );
  const project = {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 1,
    enrolledUsers: [{ avatarUrl: "", loginId: "bob", userId: 3, userLabel: "Bob Smith" }],
    id: 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    isWatching: false,
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    ownerName: "admin",
    projectName: "sample",
    openIssueCount: 1,
    openPullRequestCount: 1,
    postCount: 1,
    reviewCount: 2,
    vcs: "GIT",
    viewerCanUpdate: true,
    watchCount: 0,
  };
  const members = {
    enrollmentRequests: [{ avatarUrl: "", loginId: "bob", userId: 3, userLabel: "Bob Smith" }],
    members: [
      {
        avatarUrl: "",
        isOwner: true,
        loginId: "admin",
        role: "manager",
        userId: 1,
        userLabel: "Site Admin",
      },
    ],
    ownerName: "admin",
    projectName: "sample",
    roleOptions: [
      { label: "Manager", role: "manager" },
      { label: "Member", role: "member" },
    ],
    viewerCanUpdate: true,
  };
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/members", (route) =>
    route.fulfill({ contentType: "application/json", json: members }),
  );
  await page.route("**/api/v1/users/directory?*", (route) =>
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
