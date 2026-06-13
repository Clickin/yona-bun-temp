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
        session: { loginId: "siteboss" },
        user: { isSiteAdmin: true, loginId: "siteboss" },
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
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
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

test("site admin diagnostics preserves legacy shell and no-error message key", async ({ page }) => {
  const requests: string[] = [];

  await page.route(apiV1Route("/site/diagnostics"), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}`);
    await route.fulfill({
      body: JSON.stringify({ errorCount: 0, errors: [] }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/diagnostic");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText(
    "site.sidebar.diagnostics",
  );
  await expect(page.locator(".title_area h2.pull-left")).toHaveText(
    "site.sidebar.diagnostics",
  );
  await expect(page.getByText("site.diagnostic.errorNotFound")).toBeVisible();
  await expect(page.getByText("No errors were found")).toHaveCount(0);
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);
  await expect.poll(() => requests).toEqual(["GET /yona/api/v1/site/diagnostics"]);
});

test("site admin diagnostics renders legacy error pre blocks", async ({ page }) => {
  await page.route(apiV1Route("/site/diagnostics"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        errorCount: 2,
        errors: ["database probe failed", "repository path is unavailable"],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/diagnostic");

  await expect(page.getByText("site.diagnostic.errorFound 2")).toBeVisible();
  await expect(page.getByText("2 errors were found")).toHaveCount(0);
  await expect(page.locator(".span10 > ul > li > pre")).toHaveText([
    "database probe failed",
    "repository path is unavailable",
  ]);
  await expect(page.locator(".site-diagnostic-errors")).toHaveCount(0);
});
