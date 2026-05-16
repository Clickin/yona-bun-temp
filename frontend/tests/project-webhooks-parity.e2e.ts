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
  overview: "webhook parity",
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
  viewerCanWatch: true,
  watchCount: 0,
});

const webhookResponse = (webhooks: unknown[]) => ({
  ownerName: "owner",
  projectName: "projectYobi",
  viewerCanUpdate: true,
  webhookTypes: ["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"],
  webhooks,
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

test("project webhooks route preserves the legacy CRUD shell", async ({ page }) => {
  let webhooks: unknown[] = [];
  let created = false;
  let deleted = false;

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/webhooks"), async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
      expect(route.request().postDataJSON()).toEqual({
        gitPush: true,
        payloadUrl: "https://hooks.example/yona",
        secret: "s3",
        webhookType: "DETAIL_SLACK",
      });
      webhooks = [
        {
          gitPush: true,
          id: 15,
          payloadUrl: "https://hooks.example/yona",
          secret: "s3",
          webhookType: "DETAIL_SLACK",
        },
      ];
      created = true;
    }
    await route.fulfill({
      body: JSON.stringify(webhookResponse(webhooks)),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/webhooks/15"), async (route) => {
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
    webhooks = [];
    deleted = true;
    await route.fulfill({
      body: JSON.stringify(webhookResponse(webhooks)),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi/webhooks");
  await expect(page.locator(".webhook-editor-wrap")).toBeVisible();
  await expect(page.locator("#subMenuWebhook")).toHaveClass(/active/);
  await expect(page.locator("#formNewWebhook")).toBeVisible();
  await expect(page.locator("#webhooksList .error-wrap")).toBeVisible();

  await page.locator("input[name=payloadUrl]").fill("https://hooks.example/yona");
  await page.locator("input[name=secret]").fill("s3");
  await page.locator("input[name=webhookType][value=DETAIL_SLACK]").check();
  await page.locator("#gitPush").check();
  await page.locator("#formNewWebhook").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

  await expect.poll(() => created).toBe(true);
  const row = page.locator('[data-webhook-id="15"]');
  await expect(row).toContainText("https://hooks.example/yona");
  await expect(row).toContainText("s3");
  await expect(row).toContainText("DETAIL_SLACK");
  await expect(row.locator('input[type="checkbox"]')).toBeChecked();

  await row.locator('[data-request-method="delete"]').click();
  await expect.poll(() => deleted).toBe(true);
  await expect(page.locator("#webhooksList .error-wrap")).toBeVisible();
});
