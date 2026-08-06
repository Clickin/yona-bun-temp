import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("authenticated root home preserves legacy wrapper classes, order, and geometry", async ({
  page,
}) => {
  const legacyView = readFileSync(
    "../yona-original/app/views/index/notifications.scala.html",
    "utf8",
  );
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );

  expect(legacyView).toContain('<div class="page-wrap-outer">');
  expect(legacyView).toContain('<div class="page-wrap">');
  expect(legacyView).toContain('<div class="page on-fold-intro">');
  expect(routeSource).toContain("className={`page-wrap-outer ${");
  expect(routeSource).toContain("className={`page-wrap ${");
  expect(routeSource).toContain("className={`page on-fold-intro ${");
  expect(yobiLess).toContain('@import "less/_page.less"');
  expect(yobiLess).toContain('@import "less/_responsive.less"');
  expect(pageLess).toContain(".page-wrap-outer {");
  expect(pageLess).toContain(".page-wrap {");
  expect(responsiveLess).toContain(".page-wrap-outer {");

  await installAuthenticatedHome(page);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${BASE_PATH}/`, { waitUntil: "commit" });

    const outer = page.locator('[data-stylex-owner="authenticated-home-page-wrap-outer"]');
    const inner = page.locator('[data-stylex-owner="authenticated-home-page-wrap"]');
    const contentPage = page.locator('[data-stylex-owner="authenticated-home-content-page"]');

    await expect(outer).toBeVisible();
    await expect(inner).toBeVisible();
    await expect(contentPage).toBeVisible();
    await expect(outer).toHaveClass(/\bpage-wrap-outer\b/u);
    await expect(inner).toHaveClass(/\bpage-wrap\b/u);
    await expect(contentPage).toHaveClass(/\bpage\b/u);
    await expect(contentPage).toHaveClass(/\bon-fold-intro\b/u);
    await expect(outer.locator(":scope > .page-wrap")).toHaveCount(1);
    await expect(inner.locator(":scope > .page")).toHaveCount(1);

    const geometry = await page.evaluate(() => {
      const getBox = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      return {
        contentPage: getBox('[data-stylex-owner="authenticated-home-content-page"]'),
        documentWidth: document.documentElement.scrollWidth,
        inner: getBox('[data-stylex-owner="authenticated-home-page-wrap"]'),
        outer: getBox('[data-stylex-owner="authenticated-home-page-wrap-outer"]'),
        viewportWidth: window.innerWidth,
      };
    });

    expect(geometry.outer.top).toBeGreaterThanOrEqual(0);
    expect(geometry.outer.left).toBeGreaterThanOrEqual(0);
    expect(geometry.outer.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.inner.left).toBeGreaterThanOrEqual(geometry.outer.left - 1);
    expect(geometry.inner.right).toBeLessThanOrEqual(geometry.outer.right + 1);
    expect(geometry.contentPage.left).toBeGreaterThanOrEqual(geometry.inner.left - 1);
    expect(geometry.contentPage.right).toBeLessThanOrEqual(geometry.inner.right + 1);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  }
});

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/legacy-assets/images/default-avatar-34.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { avatarUrl: "/legacy-assets/images/default-avatar-34.png", isGuest: false },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}
