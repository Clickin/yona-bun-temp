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

test("site admin data page preserves export link and imports JSON through REST", async ({
  page,
}) => {
  let importedPayload: Record<string, unknown> | null = null;
  let exportClicked = false;

  await page.route(apiV1Route("/site/import"), async (route) => {
    importedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({ ok: true }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route("**/sites/export", async (route) => {
    exportClicked = true;
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

  const exportResponse = page.waitForResponse((response) =>
    response.url().endsWith("/sites/export"),
  );
  await page.locator('a.ybtn.ybtn-primary[href="/yona/sites/export"]').click();
  await exportResponse;
  expect(exportClicked).toBe(true);

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
