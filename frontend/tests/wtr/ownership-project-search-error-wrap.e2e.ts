import { readFile, readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("project search forbidden body keeps legacy Style parity for anonymous and authenticated viewers", async ({
  page,
}) => {
  const [
    route,
    styles,
    result,
    partialSearch,
    forbidden,
    projectLayout,
    projectMenu,
    messages,
    less,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$ownerName/$projectName/search.tsx", import.meta.url), "utf8"),
    curatedAppCss(),
    readFile(
      new URL("../../yona-original/app/views/search/result.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/search/partial_search.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/error/forbidden.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/projectLayout.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/projectMenu.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readLegacyLessChain(),
  ]);

  expect(result).toContain("@partial_search(group, project, searchResult)");
  expect(partialSearch).toContain('<div class="page-wrap-outer">');
  expect(partialSearch).toContain('<div class="project-page-wrap">');
  expect(forbidden).toContain('<div class="error-wrap">');
  expect(forbidden).toContain('<i class="ico ico-err2"></i>');
  expect(forbidden).toContain('Messages("title.login")');
  expect(projectLayout).toContain("@common.navbar(menuType, project, null)");
  expect(projectLayout).toContain("@views.html.project.header(project)");
  expect(projectMenu).toContain('<div class="project-menu-outer">');
  expect(less.page).toContain("padding:100px 0px;");
  expect(less.page).toContain("font-weight:bold; font-size:16px;");
  expect(less.sprites).toContain("background-position: -80px -160px;");
  expect(messages).toContain("error.forbidden = You are not authorized");
  expect(messages).toContain("title.login = Log in");
  expect(route).toContain("function ProjectSearchForbiddenErrorBody");
  for (const owner of [
    "project-search-forbidden-page",
    "project-search-forbidden-wrap",
    "project-search-forbidden-icon",
    "project-search-forbidden-message",
    "project-search-forbidden-login",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
  for (const declaration of []) {
    expect(styles).toContain(declaration);
  }

  for (const anonymous of [true, false]) {
    await mockForbiddenSearch(page, anonymous);
    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(
        `${basePath}/admin/sample/search?keyword=forbidden&searchType=issue&pageNum=1`,
        { waitUntil: "networkidle" },
      );

      const pageNode = page.locator('[data-owner="project-search-forbidden-page"]');
      const wrap = page.locator('[data-owner="project-search-forbidden-wrap"]');
      const icon = page.locator('[data-owner="project-search-forbidden-icon"]');
      const message = page.locator('[data-owner="project-search-forbidden-message"]');
      await expect(pageNode).toBeVisible();
      await expect(wrap).toHaveClass(/error-wrap/u);
      await expect(message).toHaveText("You are not authorized");
      await expect(page.locator('[data-owner="project-search-forbidden-login"]')).toHaveCount(
        anonymous ? 1 : 0,
      );
      await expect(wrap).toHaveCSS("padding", "100px 0px");
      await expect(wrap).toHaveCSS("text-align", "center");
      await expect(icon).toHaveCSS("background-position", "-80px -160px");
      await expect(icon).toHaveCSS("background-repeat", "no-repeat");
      await expect(icon).toHaveCSS("display", "inline-block");
      await expect(icon).toHaveCSS("width", "50px");
      await expect(icon).toHaveCSS("height", "80px");
      await expect(icon).toHaveCSS("vertical-align", "middle");
      await expect(message).toHaveCSS("color", "rgb(137, 137, 137)");
      await expect(message).toHaveCSS("font-size", "16px");
      await expect(message).toHaveCSS("font-weight", "700");
      await expect(message).toHaveCSS("margin", "30px 0px");
      const geometry = await wrap.evaluate((node) => {
        const wrapBox = node.getBoundingClientRect();
        const iconBox = node.querySelector<HTMLElement>("i")!.getBoundingClientRect();
        return {
          contained: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
          height: wrapBox.height,
          width: wrapBox.width,
          viewportWidth: window.innerWidth,
        };
      });
      expect(geometry.contained).toBe(true);
      expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth);
      expect(geometry.height).toBeGreaterThan(0);

      const fallback = page.locator('link[href*="legacy-fallback.css"]');
      await expect(fallback).toHaveCount(0);
      if (await fallback.count()) await fallback.evaluate((node) => node.remove());
      await expect(wrap).toHaveCSS("padding-top", "100px");
      await expect(icon).toHaveCSS("background-position", "-80px -160px");

      if (anonymous && viewport.width === 1366) {
        const login = page.locator('[data-owner="project-search-forbidden-login"]');
        await expect(login).toHaveAttribute(
          "href",
          `${basePath}/users/loginform?redirectUrl=${encodeURIComponent(
            `${basePath}/admin/sample/search?keyword=forbidden&searchType=issue&pageNum=1`,
          )}`,
        );
        await login.click();
        await expect(page).toHaveURL(/\/users\/loginform/);
        expect(new URL(page.url()).searchParams.get("redirectUrl")).toBe(
          `${basePath}/admin/sample/search?keyword=forbidden&searchType=issue&pageNum=1`,
        );
      }
    }
  }
});

async function readLegacyLessChain() {
  const root = new URL("../../yona-original/app/assets/stylesheets/", import.meta.url);
  const names = [
    "yobi.less",
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ];
  const contents = await Promise.all(names.map((name) => readFile(new URL(name, root), "utf8")));
  return {
    page: contents[names.indexOf("less/_page.less")]!,
    sprites: contents[names.indexOf("less/_sprites.less")]!,
  };
}

async function mockForbiddenSearch(page: Page, anonymous: boolean) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: anonymous ? null : 1,
        isAnonymous: anonymous,
        isConfirmed: !anonymous,
        isGuest: anonymous,
        loginId: anonymous ? "" : "admin",
        preferredLanguage: "en-US",
        userLabel: anonymous ? "" : "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        vcs: "GIT",
        viewerCanUpdate: true,
        showBoard: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/search?**", (route: Route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      json: { error: { code: "forbidden", message: "You are not authorized", status: 403 } },
    }),
  );
}
