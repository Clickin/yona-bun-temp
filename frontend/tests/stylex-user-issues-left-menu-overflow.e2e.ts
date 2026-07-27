import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("user issues left menu keeps the legacy search box contained", async ({ page }) => {
  const route = readFileSync("src/routes/user/issues.tsx", "utf8");
  const style = readFileSync("src/routes/user/-issues.stylex.ts", "utf8");
  const legacy = readFileSync(
    "../yona-original/app/views/issue/my_partial_search.scala.html",
    "utf8",
  );
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");

  expect(legacy).toContain('<div class="left-menu span2 span-hard-wrap">');
  expect(legacy).toContain('<div class="search-bar">');
  expect(yobiUi).toContain("&.full {");
  expect(route).toContain('data-stylex-owner="user-issues-search-bar"');
  expect(style).toContain('width: "100%"');
  expect(style).toContain('margin: "0px -5px"');
  expect(style).toContain('searchWrapper: { margin: "20px 0px" }');
  expect(route).not.toContain('className="search myissues-search-input"');

  await mockUserIssues(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/issues`, { waitUntil: "commit" });

    const menu = page.locator(".left-menu");
    const search = page.locator('[data-stylex-owner="user-issues-search-bar"]');
    await expect(menu).toBeVisible();
    await expect(search).toBeVisible();
    const metrics = await menu.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const input = node.querySelector("input[name=filter]")?.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        inputRight: input?.right,
        menuRight: box.right,
      };
    });
    expect(metrics.scrollWidth).toBe(metrics.clientWidth);
    expect(metrics.inputRight).toBeLessThanOrEqual(metrics.menuRight + 1);
    expect(metrics.height).toBeLessThan(300);

    const input = page.locator("input[name=filter]");
    await input.fill("legacy search");
    await page.locator("form#search").press("Enter");
    await expect(page).toHaveURL(/query=legacy\+search|query=legacy%20search/);
  }

  if (process.env.VITE_DISABLE_LEGACY_FALLBACK === "1") {
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
  }
});

async function mockUserIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);

  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "alice",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/user/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        filter: "assigned",
        items: [],
        openIssueCount: 0,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: {},
        state: "open",
        totalCount: 0,
        totalPages: 0,
        viewerUserId: 1,
      },
    }),
  );
}
