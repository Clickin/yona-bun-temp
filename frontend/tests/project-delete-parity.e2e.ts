import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

const projectContainerPayload = (viewerCanUpdate = true) => ({
  backgroundUrl: "",
  boardCount: 0,
  cloneUrl: "",
  codeMemberOnly: false,
  currentMilestone: null,
  defaultTab: "readme",
  enrollmentRequested: false,
  isFavorited: false,
  isForked: false,
  isWatching: false,
  logoUrl: "",
  memberCount: 1,
  members: [
    {
      avatarUrl: "",
      loginId: "owner",
      role: "manager",
      userLabel: "Owner",
    },
  ],
  openIssueCount: 0,
  openPullRequestCount: 0,
  organizationName: "",
  originOwnerName: "",
  originProjectName: "",
  overview: "delete parity",
  overviewEditable: viewerCanUpdate,
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  reviewCount: 0,
  showAdmin: viewerCanUpdate,
  showBoard: true,
  showCode: true,
  showIssue: true,
  showMilestone: true,
  showPullRequest: true,
  showReview: true,
  viewerCanEnroll: false,
  viewerCanUpdate,
  viewerCanWatch: true,
  watchCount: 0,
});

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
        session: { loginId: "owner" },
        user: { loginId: "owner" },
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
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "owner@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "owner",
        userLabel: "Owner",
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
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        daysAgo: 0,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("project deleteform preserves the legacy confirmation shell and deletes by REST", async ({
  page,
}) => {
  let deleted = false;

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi"), async (route) => {
    if (route.request().method() === "DELETE") {
      expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
      deleted = true;
      await route.fulfill({
        body: JSON.stringify({ ok: true, redirectPath: "/" }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fallback();
  });

  await page.goto("/yona/owner/projectYobi/deleteform");
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator("#subMenuProjectDelete")).toHaveClass(/active/);
  await expect(page.locator("#accept")).toBeVisible();
  await expect(page.locator("#btnDelete")).toBeDisabled();
  await expect(page.locator("#alertDeletion")).toHaveClass(/hide/);

  await page.locator("#accept").check();
  await expect(page.locator("#btnDelete")).toBeEnabled();
  await page.locator("#btnDelete").click();
  await expect(page.locator("#alertDeletion")).not.toHaveClass(/hide/);
  await page.locator("#btnDeleteExec").click();

  await expect.poll(() => deleted).toBe(true);
  await expect(page).toHaveURL(/\/yona\/?$/);
});

test("project deleteform shows the forbidden shell for non-updaters", async ({ page }) => {
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload(false)),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi/deleteform");
  await expect(page.locator("text=Forbidden")).toBeVisible();
  await expect(page.locator("#btnDelete")).toHaveCount(0);
});
