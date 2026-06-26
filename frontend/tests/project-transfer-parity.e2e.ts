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
  overview: "transfer parity",
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

test("project transfer route preserves the legacy request shell", async ({ page }) => {
  let requested = false;
  let transferPostCount = 0;

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/transfer"), async (route) => {
    if (route.request().method() === "POST") {
      transferPostCount += 1;
      expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
      expect(route.request().postDataJSON()).toEqual({
        destination: "recipient",
      });
      requested = true;
      await route.fulfill({
        body: JSON.stringify({
          acceptPath: "/project/transfer/9/abc",
          confirmKey: "abc",
          destination: "recipient",
          newProjectName: "projectYobi",
          ownerName: "owner",
          projectName: "projectYobi",
          redirectPath: "/owner/projectYobi",
          transferId: 9,
          viewerCanTransfer: true,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        ownerName: "owner",
        projectName: "projectYobi",
        viewerCanTransfer: true,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi/transfer");
  await expect(page.locator("#subMenuProjectTransfer")).toHaveClass(/active/);
  await expect(page.locator("#owner")).toBeVisible();
  await expect(page.locator("#accept")).toBeVisible();
  await expect(page.locator("#btnTransfer")).toBeVisible();
  await expect(page.locator("#alertTransfer")).toHaveClass(/hide/);
  await expect(page.locator("body")).not.toContainText("project.transfer");

  await page.locator("#owner").fill("recipient");
  await page.locator("#btnTransfer").click();
  await expect(page.locator(".alert.alert-error")).toContainText(
    "You should agree with the transfer of this project.",
  );
  await expect(page.locator("#alertTransfer")).toHaveClass(/hide/);
  await expect.poll(() => transferPostCount).toBe(0);

  await page.locator("#accept").check();
  await page.locator("#btnTransfer").click();
  await expect(page.locator("#alertTransfer")).not.toHaveClass(/hide/);
  await page.locator("#btnTransferExec").click();
  await expect.poll(() => requested).toBe(true);
});
