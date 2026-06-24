import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

const projectContainerPayload = () => ({
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
  overview: "fork parity",
  overviewEditable: true,
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  reviewCount: 0,
  showAdmin: true,
  showBoard: true,
  showCode: true,
  showIssue: true,
  showMilestone: true,
  showPullRequest: true,
  showReview: true,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
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

test("project fork route preserves the legacy fork shell and posts REST mutation", async ({
  page,
}) => {
  let requested = false;

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/fork-options"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        canFork: true,
        existingForks: [],
        ownerOptions: [
          { organization: false, ownerName: "owner", selected: true },
          { organization: true, ownerName: "team", selected: false },
        ],
        selected: {
          ownerName: "owner",
          projectName: "projectYobi",
          projectScope: "public",
        },
        source: {
          isForked: false,
          overview: "fork parity",
          ownerName: "owner",
          projectName: "projectYobi",
          projectScope: "public",
          vcs: "GIT",
        },
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/fork"), async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
    expect(route.request().postDataJSON()).toEqual({
      name: "projectFork",
      owner: "team",
      projectScope: "protected",
    });
    requested = true;
    await route.fulfill({
      body: JSON.stringify({
        ok: true,
        project: {
          enrollmentRequested: false,
          isFavorited: false,
          organizationName: "team",
          overview: "fork parity",
          ownerName: "team",
          projectName: "projectFork",
          projectScope: "protected",
          viewerCanEnroll: false,
          viewerCanUpdate: true,
        },
        redirectPath: "/team/projectFork",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi/newFork");
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator(".project-page-wrap")).toBeVisible();
  await expect(page.locator(".content-wrap.frm-wrap")).toBeVisible();
  await expect(page.locator("#helpMessage")).toBeVisible();
  await expect(page.locator("#project-owner")).toBeVisible();
  await expect(page.locator("#inputName")).toBeVisible();
  await expect(page.locator("#public")).toBeVisible();
  await expect(page.locator("#private")).toBeVisible();

  await page.locator("#project-owner").selectOption("team");
  await expect(page.locator("#protected")).toBeVisible();
  await page.locator("#inputName").fill("projectFork");
  await page.locator("#protected").check();
  await page.locator('button[type="submit"].ybtn-info').click();
  await expect.poll(() => requested).toBe(true);
});
