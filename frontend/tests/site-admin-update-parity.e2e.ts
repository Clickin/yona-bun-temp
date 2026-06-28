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
  await page.route(apiV1Route("/site/update"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        currentVersion: "1.0.0",
        error: null,
        message: "site.update.isNotNecessary",
        releaseUrl: null,
        versionToUpdate: null,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("site admin update preserves legacy shell without placeholder fallback", async ({ page }) => {
  await page.goto("/yona/sites/update");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Software Update");
  await expect(page.locator(".title_area h2.pull-left")).toHaveText("Software Update");
  await expect(page.getByText("Current version is Yona 1.0.0")).toBeVisible();
  await expect(page.getByText("You are using the latest version")).toBeVisible();
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);
});

test("site admin update renders the legacy download branch when a version is available", async ({
  page,
}) => {
  await page.route(apiV1Route("/site/update"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        currentVersion: "1.0.0",
        error: null,
        message: "site.update.isAvailable",
        releaseUrl: "https://example.test/yona-1.1.0",
        versionToUpdate: "1.1.0",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/update");

  await expect(page.locator("strong", { hasText: "Yona 1.1.0 is available" })).toBeVisible();
  await expect(page.getByText("Current version is Yona 1.0.0")).toBeVisible();
  await expect(page.getByText("You are using the latest version")).toHaveCount(0);
  await expect(
    page.locator('a.ybtn.ybtn-success[href="/yona/sites/update/download-file"]'),
  ).toHaveText("Download");
});
