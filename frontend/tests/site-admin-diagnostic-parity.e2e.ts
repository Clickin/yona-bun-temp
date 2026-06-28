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
});

test("site admin diagnostics keeps legacy message and pre-block alignment", async ({ page }) => {
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

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/sites/diagnostic");

  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Site management");
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Diagnostics");
  await expect(page.locator(".span10 > ul > li > pre")).toHaveCount(2);

  const navbar = await layoutBox(page, ".gnb-outer");
  const breadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const pageOuter = await layoutBox(page, ".site-admin-page .page-wrap-outer");
  const sidebar = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span2");
  const content = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span10");
  const titleArea = await layoutBox(page, ".site-setting-wrap .title_area");
  const message = await layoutBox(page, ".site-setting-wrap .span10 > p");
  const list = await layoutBox(page, ".site-setting-wrap .span10 > ul");
  const firstPre = await layoutBox(page, ".site-setting-wrap .span10 > ul > li:first-child pre");
  const secondPre = await layoutBox(page, ".site-setting-wrap .span10 > ul > li:nth-child(2) pre");
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
  expect(message.y).toBeGreaterThan(titleArea.y + titleArea.height - 1);
  expect(message.x).toBeCloseTo(content.x, 0);
  expect(list.y).toBeGreaterThan(message.y + message.height - 1);
  expect(list.x).toBeGreaterThanOrEqual(content.x);
  expect(firstPre.width).toBeGreaterThanOrEqual(500);
  expect(secondPre.y).toBeGreaterThan(firstPre.y + firstPre.height - 1);
});

test("site admin diagnostics preserves legacy shell and no-error copy", async ({ page }) => {
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
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Diagnostics");
  await expect(page.locator(".title_area h2.pull-left")).toHaveText("Diagnostics");
  await expect(page.getByText("No errors were found")).toBeVisible();
  await expect(page.getByText("site.diagnostic.errorNotFound")).toHaveCount(0);
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);
  await expect.poll(() => requests).toEqual(["GET /yona/api/v1/site/diagnostics"]);
});

test("site admin diagnostics keeps the legacy admin shell on a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.route(apiV1Route("/site/diagnostics"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({ errorCount: 0, errors: [] }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/diagnostic");

  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Diagnostics");
  await expect(page.getByText("No errors were found")).toBeVisible();
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

  await expect(page.getByText("2 errors were found")).toBeVisible();
  await expect(page.getByText("site.diagnostic.errorFound 2")).toHaveCount(0);
  await expect(page.locator(".span10 > ul > li > pre")).toHaveText([
    "database probe failed",
    "repository path is unavailable",
  ]);
  await expect(page.locator(".site-diagnostic-errors")).toHaveCount(0);
});
