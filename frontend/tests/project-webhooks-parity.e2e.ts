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
      body: JSON.stringify({ session: null, user: null }),
      headers: { ...restJsonHeaders, "x-csrf-token": "csrf-123" },
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

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "https://example.com/admin/projectYobi.git",
        codeMemberOnly: false,
        defaultTab: "readme",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 2,
        members: [],
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Webhook parity",
        overviewEditable: false,
        ownerName: "admin",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 0,
        showAdmin: true,
        showBoard: false,
        showCode: false,
        showIssue: false,
        showMilestone: false,
        showPullRequest: false,
        showReview: false,
        viewerCanEnroll: false,
        viewerCanUpdate: true,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("renders and mutates the legacy project webhook route", async ({ page }) => {
  const webhooks = [
    {
      gitPush: true,
      id: 1,
      payloadUrl: "https://hooks.example.test/old",
      secret: "old-token",
      webhookType: "SIMPLE",
    },
  ];

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/webhooks(?:\/\d+)?$/,
    async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          body: JSON.stringify({
            permissions: { canCreate: true, canDelete: true },
            webhooks,
          }),
          headers: restJsonHeaders,
          status: 200,
        });
        return;
      }
      if (request.method() === "POST") {
        const body = request.postDataJSON() as {
          gitPush: boolean;
          payloadUrl: string;
          secret: string;
          webhookType: string;
        };
        expect(body).toEqual({
          gitPush: true,
          payloadUrl: "https://hooks.example.test/new",
          secret: "new-token",
          webhookType: "DETAIL_SLACK",
        });
        webhooks.push({
          gitPush: body.gitPush,
          id: 2,
          payloadUrl: body.payloadUrl,
          secret: body.secret,
          webhookType: body.webhookType,
        });
        await route.fulfill({
          body: JSON.stringify({
            permissions: { canCreate: true, canDelete: true },
            webhooks,
          }),
          headers: restJsonHeaders,
          status: 200,
        });
        return;
      }
      if (request.method() === "DELETE") {
        const webhookId = Number(new URL(request.url()).pathname.split("/").pop());
        const index = webhooks.findIndex((webhook) => webhook.id === webhookId);
        if (index >= 0) {
          webhooks.splice(index, 1);
        }
        await route.fulfill({
          body: JSON.stringify({
            permissions: { canCreate: true, canDelete: true },
            webhooks,
          }),
          headers: restJsonHeaders,
          status: 200,
        });
        return;
      }
      await route.fallback();
    },
  );

  await page.goto("/yona/admin/projectYobi/webhooks");

  await expect(
    page.locator(".page-wrap-outer .project-page-wrap.webhook-editor-wrap"),
  ).toBeVisible();
  await expect(page.locator("#formNewWebhook.new-webhook-wrap")).toBeVisible();
  await expect(page.locator("#webhooksList.webhook-list-wrap")).toBeVisible();
  await expect(page.locator(".row-fluid.list-item.vertical-align")).toHaveCount(1);
  await expect(page.locator('[data-webhook-id="1"] .span5.payload-url')).toContainText(
    "https://hooks.example.test/old",
  );
  await expect(page.locator('[data-webhook-id="1"] .span2.secret.text-center')).toContainText(
    "old-token",
  );

  await page.locator('input[name="payloadUrl"]').fill("https://hooks.example.test/new");
  await page.locator('input[name="secret"]').fill("new-token");
  await page.locator('input[name="webhookType"][value="DETAIL_SLACK"]').check();
  await page.locator("#gitPush").check();
  await page.locator("#formNewWebhook .btn-submit").click();

  await expect(page.locator(".row-fluid.list-item.vertical-align")).toHaveCount(2);
  await expect(page.locator("#webhooksList")).toContainText("https://hooks.example.test/new");
  await expect(page.locator("#webhooksList")).toContainText("new-token");
  await expect(page.locator('[data-webhook-id="2"]')).toContainText("Slack");

  await page.locator('[data-webhook-id="1"] [data-request-method="delete"]').click();

  await expect(page.locator(".row-fluid.list-item.vertical-align")).toHaveCount(1);
  await expect(page.locator('[data-webhook-id="1"]')).toHaveCount(0);
  await expect(page.locator('[data-webhook-id="2"]')).toBeVisible();
});
