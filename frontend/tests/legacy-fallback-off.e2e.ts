import { expect, test, type Page, type Route } from "@playwright/test";

const generatedFallbackHref = "legacy-assets/stylesheets/legacy-fallback.css";

async function mockMassMailSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-massmail" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({ json: { projects: [{ ownerName: "admin", projectName: "projectYobi" }] } }),
  );
}

async function mockProjectListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-project-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

async function mockPostListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-post-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: "Release checklist",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

test("generated fallback excludes only proven dead Yobi selectors", async ({ page }) => {
  test.skip(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1",
    "normal runtime asset contract",
  );

  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/") ? configuredBasePath : `${configuredBasePath}/`;
  await page.goto(basePath, { waitUntil: "commit" });

  const fallbackLink = page.locator(`link[href$="${generatedFallbackHref}"]`);
  await expect(fallbackLink).toHaveCount(1);
  const fallbackHref = await fallbackLink.getAttribute("href");
  if (!fallbackHref) {
    throw new Error("Generated legacy fallback link must have an href.");
  }
  const fallbackCss = await page.evaluate(async (href) => {
    const response = await fetch(href);
    return response.text();
  }, fallbackHref);

  for (const selector of [
    ".all-projects .project .info-wrap .forked",
    ".all-projects .project .stats-wrap .like",
    ".all-projects .project .stats-wrap .like .num",
    ".all-projects .project .stats-wrap .like .ico",
    ".profile-frmwrap .avatar-frm",
    ".profile-frmwrap .avatar-frm .avatar-wrap",
    ".profile-frmwrap .avatar-frm .avatar-wrap .progress",
    ".profile-frmwrap .avatar-frm .avatar-wrap .progress.loading",
    ".profile-frmwrap .avatar-frm .btn-wrap",
    ".profile-frmwrap .avatar-frm .btn-wrap .nbtn i",
    ".milestones .milestone .infos .desc",
  ]) {
    expect(fallbackCss).not.toContain(`${selector} {`);
  }

  expect(fallbackCss).toContain(".all-projects .project .stats-wrap .members {");
  expect(fallbackCss).toContain(".profile-frmwrap dl {");
  expect(fallbackCss).toContain(".profile-frmwrap form {");
  expect(fallbackCss).toContain(".milestones .milestone .infos .progress-wrap {");
  expect(fallbackCss).toContain(".milestones .milestone .infos .actrow {");
  expect(fallbackCss).toContain(".milestones .milestone .completion-rate {");
});

test("fallback-off discovery mode removes the generated legacy stylesheet", async ({ page }) => {
  test.skip(
    process.env.VITE_DISABLE_LEGACY_FALLBACK !== "1",
    "runs only through test:e2e:fallback-off",
  );

  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/") ? configuredBasePath : `${configuredBasePath}/`;
  await page.goto(basePath, { waitUntil: "commit" });

  await expect(
    page.locator(`link[href$="${generatedFallbackHref}"]`),
  ).toHaveCount(0);
  await expect(page.locator("#root")).toHaveCount(1);
});

test("massmail default and selected-project output retain the runtime fallback boundary", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockMassMailSession(page);
  await page.goto(`${basePath}/sites/massmail`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  await expect(page.locator("#mailtoAll")).toBeChecked();
  await expect(page.locator("#project-list-wrap")).toBeHidden();
  await expect(page.locator(".site-admin-page, .project-select-row")).toHaveCount(0);

  await page.locator("#mailtoPrj").check();
  await page.locator("#input-project").fill("admin/projectYobi");
  await page.locator("#select-project").click();
  await expect(page.locator("#selected-projects")).toHaveText("admin/projectYobi x");
  await expect(page.locator(".site-admin-page, .project-select-row")).toHaveCount(0);
});

test("project-list output retains the runtime fallback boundary without its dead bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockProjectListSession(page);
  await page.goto(`${basePath}/sites/projectList?filter=road`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const container = page.locator('[data-stylex-owner="site-project-list-container"]');
  await expect(container).toBeVisible();
  await expect(container.locator('[data-stylex-owner="site-project-list-project-name"]')).toHaveText(
    "acme/roadmap",
  );
  await expect(page.locator(".site-admin-page, .project-list-wrap")).toHaveCount(0);
});

test("post-list output retains the runtime fallback boundary without its dead bridge", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockPostListSession(page);
  await page.goto(`${basePath}/sites/postList`);

  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  const container = page.locator('[data-stylex-owner="site-post-list-container"]');
  await expect(container).toBeVisible();
  await expect(container.locator('[data-stylex-owner="site-post-list-row"]')).toHaveCount(1);
  await expect(page.locator(".site-admin-page, .post-list-wrap")).toHaveCount(0);
});
