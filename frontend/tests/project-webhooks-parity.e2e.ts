import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;
const PROJECT_ADMIN_RAW_KEY_PATTERN = /\b(?:project|button)\.[a-z][A-Za-z0-9_.-]*/;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

async function assertNoProjectAdminRawKeys(page: Page): Promise<void> {
  await expect(page.locator("body")).not.toContainText(PROJECT_ADMIN_RAW_KEY_PATTERN);
}

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
  deliveries: [],
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
  const webhookRequests: Array<{ body: unknown; method: string; path: string; csrf?: string }> = [];

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/webhooks"), async (route) => {
    if (route.request().method() === "POST") {
      webhookRequests.push({
        body: route.request().postDataJSON(),
        csrf: route.request().headers()["x-csrf-token"],
        method: route.request().method(),
        path: new URL(route.request().url()).pathname.replace("/yona/api/v1", ""),
      });
      webhooks = [
        {
          gitPush: true,
          id: 15,
          payloadUrl: "https://hooks.example/yona",
          secret: "s3",
          webhookType: "JSON",
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
  await assertNoProjectAdminRawKeys(page);

  const projectPage = await layoutBox(page, ".page-wrap-outer > .project-page-wrap");
  const settingMenu = await layoutBox(
    page,
    ".page-wrap-outer > .project-page-wrap > .nav.nav-tabs",
  );
  const webhookPage = await layoutBox(page, ".project-page-wrap.webhook-editor-wrap");
  const form = await layoutBox(page, "#formNewWebhook.new-webhook-wrap");
  const legend = await layoutBox(page, "#formNewWebhook .form-legend");
  const actions = await layoutBox(page, "#formNewWebhook .form-wrap.form-actions");
  const payload = await layoutBox(page, "#formNewWebhook .input-webhook-payload");
  const secret = await layoutBox(page, "#formNewWebhook .input-webhook-secret");
  const submit = await layoutBox(page, "#formNewWebhook .btn-submit");
  const typeRow = await layoutBox(
    page,
    "#formNewWebhook .form-wrap.form-actions > div:nth-child(2)",
  );
  const help = await layoutBox(page, "#formNewWebhook > div:nth-child(3)");
  const list = await layoutBox(page, "#webhooksList.webhook-list-wrap");

  expect(webhookPage.x).toBeGreaterThanOrEqual(projectPage.x);
  expect(webhookPage.width).toBeLessThanOrEqual(projectPage.width + 1);
  expect(settingMenu.y).toBeGreaterThanOrEqual(projectPage.y);
  expect(form.y).toBeGreaterThan(settingMenu.y + settingMenu.height - 1);
  expect(legend.y).toBeGreaterThanOrEqual(form.y);
  expect(actions.y).toBeGreaterThan(legend.y + legend.height - 1);
  expect(payload.x).toBeGreaterThanOrEqual(actions.x);
  expect(secret.x).toBeGreaterThan(payload.x + payload.width - 1);
  expect(submit.x).toBeGreaterThan(secret.x + secret.width - 1);
  expect(typeRow.y).toBeGreaterThan(payload.y + payload.height - 1);
  expect(help.y).toBeGreaterThan(actions.y + actions.height - 1);
  expect(list.y).toBeGreaterThan(form.y + form.height - 1);

  await page.locator("#formNewWebhook").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await expect(page.getByRole("alert")).toHaveText("Payload URL is a required field.");
  await assertNoProjectAdminRawKeys(page);
  expect(webhookRequests).toHaveLength(0);

  await page.locator("input[name=payloadUrl]").fill("https://hooks.example/yona");
  await page.locator("input[name=secret]").fill("s3");
  await page.locator("input[name=webhookType][value=JSON]").check();
  await expect(page.locator("#gitPush")).toBeChecked();
  await expect(page.locator("#gitPush")).toBeDisabled();
  await page.locator("#formNewWebhook").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

  await expect.poll(() => created).toBe(true);
  expect(webhookRequests).toEqual([
    {
      body: {
        gitPush: true,
        payloadUrl: "https://hooks.example/yona",
        secret: "s3",
        webhookType: "JSON",
      },
      csrf: "csrf-123",
      method: "POST",
      path: "/owners/owner/projects/projectYobi/webhooks",
    },
  ]);
  const row = page.locator('[data-webhook-id="15"]');
  await expect(row).toContainText("https://hooks.example/yona");
  await expect(row).toContainText("s3");
  await expect(row).toContainText("JSON");
  await expect(row.locator('input[type="checkbox"]')).toBeChecked();

  await row.locator('[data-request-method="delete"]').click();
  await expect.poll(() => deleted).toBe(true);
  await expect(page.locator("#webhooksList .error-wrap")).toBeVisible();
});

test("project webhooks route renders the legacy forbidden shell for non-updaters", async ({
  page,
}) => {
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        ...projectContainerPayload(),
        showAdmin: false,
        viewerCanUpdate: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/webhooks"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        error: {
          code: "permission_denied",
          message: "forbidden",
          status: 403,
        },
      }),
      headers: restJsonHeaders,
      status: 403,
    });
  });

  await page.goto("/yona/owner/projectYobi/webhooks");
  await expect(page.locator(".error-wrap > p").first()).toHaveText("You are not authorized");
  await assertNoProjectAdminRawKeys(page);
  await expect(page.locator("#formNewWebhook")).toHaveCount(0);
  await expect(page.locator('[data-request-method="delete"]')).toHaveCount(0);
});
