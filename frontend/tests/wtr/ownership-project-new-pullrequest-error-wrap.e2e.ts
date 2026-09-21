import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const copy = "Pull request sending repository does not exist";

test.use({ locale: "en-US" });

test("new pull request 400 error-wrap preserves legacy Style parity", async ({ page }) => {
  const [
    route,
    styles,
    create,
    search,
    badRequest,
    projectLayout,
    projectMenu,
    pageLess,
    sprites,
    messages,
  ] = await Promise.all([
    readFile(
      new URL("../src/routes/$ownerName/$projectName/newPullRequestForm.tsx", import.meta.url),
      "utf8",
    ),
    curatedAppCss(),
    readFile(
      new URL("../../yona-original/app/views/git/create.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/git/partial_search.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/error/badrequest.scala.html", import.meta.url),
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
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_sprites.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(create).toContain("@projectLayout(title, project, utils.MenuType.PULL_REQUEST)");
  expect(create).toContain('@projectMenu(project, utils.MenuType.PULL_REQUEST, "main-menu-only")');
  expect(search).toContain('<div pjax-container class="row-fluid cb">');
  expect(badRequest).toContain('<div class="page-wrap-outer">');
  expect(badRequest).toContain('<div class="project-page-wrap">');
  expect(badRequest).toContain('<div class="error-wrap">');
  expect(badRequest).toContain('<i class="ico ico-err2"></i>');
  expect(projectLayout).toContain("@common.navbar(menuType, project, null)");
  expect(projectMenu).toContain("project-menu-outer");
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(pageLess).toContain("font-weight:bold; font-size:16px;");
  expect(sprites).toContain("background-position: -80px -160px;");
  expect(messages).toContain(`error.pullRequest.empty.from.repository = ${copy}`);
  for (const owner of [
    "new-pull-request-error-page",
    "new-pull-request-error-wrap",
    "new-pull-request-error-icon",
    "new-pull-request-error-message",
  ])
    expect(route).toContain(`data-owner="${owner}"`);
  for (const declaration of []) expect(styles).toContain(declaration);

  await mockBadRequest(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/newPullRequestForm`, { waitUntil: "commit" });
    const wrap = page.locator('[data-owner="new-pull-request-error-wrap"]');
    const icon = page.locator('[data-owner="new-pull-request-error-icon"]');
    const message = page.locator('[data-owner="new-pull-request-error-message"]');
    await expect(wrap).toBeVisible();
    await expect(message).toHaveText(copy);
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
    const geometry = await wrap.evaluate((element) => {
      const wrapBox = element.getBoundingClientRect();
      const pageBox = element
        .closest<HTMLElement>("[data-owner='new-pull-request-error-page']")
        ?.getBoundingClientRect();
      return {
        pageRight: pageBox?.right ?? 0,
        pageLeft: pageBox?.left ?? 0,
        wrapRight: wrapBox.right,
        wrapLeft: wrapBox.left,
      };
    });
    expect(geometry.wrapLeft).toBeGreaterThanOrEqual(geometry.pageLeft);
    expect(geometry.wrapRight).toBeLessThanOrEqual(geometry.pageRight);
    const fallback = page.locator('link[href*="legacy-fallback.css"]');
    await expect(fallback).toHaveCount(0);
    if (await fallback.count()) await fallback.evaluate((element) => element.remove());
    await expect(wrap).toHaveCSS("padding-top", "100px");
    await expect(icon).toHaveCSS("background-position", "-80px -160px");
  }
});

async function mockBadRequest(page: Page) {
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
        actorId: null,
        isAnonymous: true,
        isConfirmed: false,
        isGuest: false,
        loginId: "",
        preferredLanguage: "en-US",
        userLabel: "",
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
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/form-options**",
    (route: Route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: { status: 400 } }),
      }),
  );
}
