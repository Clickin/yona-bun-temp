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
        session: {
          isAnonymous: false,
          loginId: "admin",
        },
        user: {
          loginId: "admin",
        },
      }),
      headers: { ...restJsonHeaders, "x-csrf-token": "csrf-123" },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: false,
        loginId: "admin",
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
        overview: "Delete parity",
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

test("renders and submits the legacy project delete confirmation route", async ({ page }) => {
  let deleted = false;
  await page.route(apiV1Route("/owners/admin/projects/projectYobi"), async (route) => {
    const request = route.request();
    if (request.method() === "DELETE") {
      expect(request.headers()["x-csrf-token"]).toBe("csrf-123");
      deleted = true;
      await route.fulfill({
        body: JSON.stringify({
          ok: true,
          redirectPath: "/",
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fallback();
  });

  await page.goto("/yona/admin/projectYobi/deleteform");

  await expect(page.locator(".page-wrap-outer .project-page-wrap")).toBeVisible();
  await expect(page.locator("#subMenuProjectDelete")).toBeVisible();
  await expect(page.locator(".bubble-wrap.gray.wp")).toBeVisible();
  await expect(page.locator("#accept")).toBeVisible();
  await expect(page.locator("#btnDelete")).toBeVisible();
  await expect(page.locator("#alertDeletion")).toBeVisible();
  await expect(page.locator("#btnDeleteExec")).toBeDisabled();

  await page.locator("#accept").check();
  await expect(page.locator("#btnDeleteExec")).toBeEnabled();
  await page.locator("#btnDelete").click();
  await page.locator("#btnDeleteExec").click();
  await expect.poll(() => deleted).toBe(true);
  await expect(page).toHaveURL(/\/yona\/?$/);
});
