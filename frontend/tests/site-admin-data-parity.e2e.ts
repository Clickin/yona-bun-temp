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

test("site admin data page keeps legacy warning, export, and import alignment", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/sites/data");

  await expect(page.locator(".site-breadcrumb-outer h3")).toHaveText("Site management");
  await expect(page.locator(".site-setting-nav")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active")).toHaveCount(0);
  await expect(page.locator(".cu-desc .notice")).toHaveCount(3);

  const navbar = await layoutBox(page, ".gnb-outer");
  const breadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const pageOuter = await layoutBox(page, ".site-admin-page .page-wrap-outer");
  const sidebar = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span2");
  const content = await layoutBox(page, ".site-setting-wrap > .row-fluid > .span10");
  const titleArea = await layoutBox(page, ".site-setting-wrap .title_area");
  const warning = await layoutBox(page, ".site-setting-wrap .cu-desc");
  const exportHeading = await layoutBox(page, ".site-setting-wrap .span10 > h3:nth-of-type(1)");
  const exportInfo = await layoutBox(page, ".site-setting-wrap .span10 > p:nth-of-type(1)");
  const exportButton = await layoutBox(page, "a.ybtn.ybtn-primary[href='/yona/sites/export']");
  const importHeading = await layoutBox(page, ".site-setting-wrap .span10 > h3:nth-of-type(2)");
  const importInfo = await layoutBox(page, ".site-setting-wrap .span10 > p:nth-of-type(2)");
  const importForm = await layoutBox(page, "form[enctype='multipart/form-data']");
  const fileInput = await layoutBox(page, "input[name='data']");
  const submit = await layoutBox(page, "form[enctype='multipart/form-data'] input[type='submit']");
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
  expect(warning.y).toBeGreaterThan(titleArea.y + titleArea.height - 1);
  expect(warning.x).toBeCloseTo(content.x, 0);
  expect(exportHeading.y).toBeGreaterThan(warning.y + warning.height - 1);
  expect(exportInfo.y).toBeGreaterThan(exportHeading.y + exportHeading.height - 1);
  expect(exportButton.y).toBeGreaterThan(exportInfo.y + exportInfo.height - 1);
  expect(importHeading.y).toBeGreaterThan(exportButton.y + exportButton.height - 1);
  expect(importInfo.y).toBeGreaterThan(importHeading.y + importHeading.height - 1);
  expect(importForm.y).toBeGreaterThan(importInfo.y + importInfo.height - 1);
  expect(fileInput.x).toBeCloseTo(importForm.x, 0);
  expect(submit.y).toBeGreaterThan(fileInput.y + fileInput.height - 1);
});

test("site admin data page preserves export link and imports JSON through REST", async ({
  page,
}) => {
  let importedPayload: Record<string, unknown> | null = null;

  await page.route(apiV1Route("/site/import"), async (route) => {
    importedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({ ok: true }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route("**/sites/export", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ exported: true }),
      headers: {
        "content-disposition": 'attachment; filename="yona-data.json"',
        "content-type": "application/json",
      },
      status: 200,
    });
  });

  await page.goto("/yona/sites/data");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".title_area h2.pull-left")).toHaveText("Data");
  await expect(page.locator(".cu-desc")).toContainText(
    "Before importing or exporting data, you should block other user's access",
  );
  await expect(page.locator('a.ybtn.ybtn-primary[href="/yona/sites/export"]')).toContainText(
    "Export",
  );
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("site.data.");

  await page.goto("/yona/sites/data");

  await page.locator('input[name="data"]').setInputFiles({
    buffer: Buffer.from(JSON.stringify({ projects: [{ name: "imported" }] })),
    mimeType: "application/json",
    name: "site-data.json",
  });
  await page.locator('form[enctype="multipart/form-data"] input[type="submit"]').click();

  await expect
    .poll(() => importedPayload)
    .toEqual({
      projects: [{ name: "imported" }],
    });
});
