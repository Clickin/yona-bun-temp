import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

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

test("site admin update keeps legacy shell and message alignment", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/sites/update");

  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Site management");
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Software Update");

  const navbar = await layoutBox(page, ".gnb-outer");
  const breadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const pageOuter = await layoutBox(page, ".site-admin-page .page-wrap-outer");
  const sidebar = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span2");
  const content = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span10");
  const titleArea = await layoutBox(page, ".site-setting-wrap .title_area");
  const currentVersion = await layoutBox(page, ".site-setting-wrap .span10 > p:nth-of-type(1)");
  const latest = await layoutBox(page, ".site-setting-wrap .span10 > p:nth-of-type(2)");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(navbar.height).toBeGreaterThanOrEqual(38);
  expect(navbar.height).toBeLessThanOrEqual(44);
  expect(breadcrumb.y).toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  expect(pageOuter.y).toBeGreaterThanOrEqual(breadcrumb.y + breadcrumb.height + 8);
  expect(footer.y).toBeGreaterThan(pageOuter.y + pageOuter.height - 1);

  expect(sidebar.x).toBeLessThan(content.x);
  expect(sidebar.width).toBeGreaterThanOrEqual(170);
  expect(sidebar.width).toBeLessThanOrEqual(190);
  expect(content.width).toBeGreaterThanOrEqual(840);
  expect(Math.abs(sidebar.y - content.y)).toBeLessThanOrEqual(1);

  expect(titleArea.x).toBeCloseTo(content.x, 0);
  expect(titleArea.width).toBeCloseTo(content.width, 0);
  expect(currentVersion.y).toBeGreaterThan(titleArea.y + titleArea.height - 1);
  expect(currentVersion.x).toBeCloseTo(content.x, 0);
  expect(latest.y).toBeGreaterThan(currentVersion.y + currentVersion.height - 1);
  expect(latest.x).toBeCloseTo(currentVersion.x, 0);
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
