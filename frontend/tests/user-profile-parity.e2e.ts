import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: null,
        user: null,
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("public user profile route preserves the legacy user view shell", async ({ page }) => {
  await page.route(/\/api\/v1\/users\/door\/profile(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        daysAgo: 7,
        issueItems: [],
        memberProjects: [
          {
            createdLabel: "May 16, 2026",
            lastPushedLabel: "May 16, 2026",
            memberCount: 2,
            ownerName: "owner",
            overview: "Visible member project",
            projectName: "publicYobi",
            projectScope: "public",
            watchCount: 3,
          },
        ],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door",
          englishName: "Door English",
          isBlocked: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "May 16, 2026",
        },
        pullRequestItems: [],
        selected: "projects",
        viewerCanEditProfile: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/door?daysAgo=7&selected=projects");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer .user-box")).toBeVisible();
  await expect(page.locator(".user-info-box .loginid")).toHaveText("@door");
  await expect(page.locator("#daysAgoBtn")).toHaveValue("7");
  await expect(page.locator("#projects")).toBeVisible();
  await expect(page.locator(".user-streams.all-projects .project")).toHaveCount(1);
  await expect(page.locator('a.project-name[href="/yona/owner/publicYobi"]')).toBeVisible();
  await expect(page.getByText("Default landing")).toHaveCount(0);
  await expect(page.getByText("Sign out")).toHaveCount(0);
  await expect(page.getByText("Edit Profile")).toHaveCount(0);
});

test("organization names on the user profile endpoint redirect to the organization route", async ({
  page,
}) => {
  await page.route(apiV1Route("/users/weblabs/profile"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        daysAgo: 14,
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        redirectPath: "/organizations/weblabs",
        selected: "issues",
        viewerCanEditProfile: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/organizations/weblabs/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        adminMembers: [],
        description: "web labs",
        enrollmentRequested: false,
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanEnroll: true,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/weblabs");
  await expect(page).toHaveURL(/\/yona\/organizations\/weblabs$/);
});
