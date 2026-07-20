import { readFile } from "node:fs/promises";
import { expect, test, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("pull-request detail error state preserves legacy StyleX geometry", async ({ page }) => {
  const [route, styles, legacy, notFound, forbidden, pageLess, sprites, messages] =
    await Promise.all([
      readFile(
        new URL(
          "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../src/routes/$ownerName/$projectName/pullRequest/-pull-request-detail.stylex.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/views/git/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/views/error/notfound.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/views/error/forbidden.scala.html", import.meta.url),
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

  expect(legacy).toContain('@partial_info(project, pull, "overview")');
  expect(notFound).toContain('<div class="error-wrap">');
  expect(notFound).toContain('<i class="ico ico-err2"></i>');
  expect(notFound).toContain('@Messages("button.list")');
  expect(forbidden).toContain('<div class="error-wrap">');
  expect(forbidden).toContain('<i class="ico ico-err2"></i>');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(pageLess).toContain("font-weight:bold; font-size:16px;");
  expect(sprites).toContain(".ico-err2");
  expect(sprites).toContain("background-position: -80px -160px;");
  expect(messages).toContain("error.notfound = Page not found");
  expect(route).toContain('data-stylex-owner="pull-request-detail-error-wrap"');
  expect(route).toContain('data-stylex-owner="pull-request-detail-error-icon"');
  expect(route).toContain('data-stylex-owner="pull-request-detail-error-message"');
  for (const declaration of [
    'errorWrap: { padding: "100px 0px", textAlign: "center" }',
    'backgroundPosition: "-80px -160px"',
    'backgroundRepeat: "no-repeat"',
    'display: "inline-block"',
    'height: "80px"',
    'verticalAlign: "middle"',
    'width: "50px"',
    'color: "#898989"',
    'fontSize: "16px"',
    'fontWeight: "bold"',
    'margin: "30px 0px"',
  ]) {
    expect(styles).toContain(declaration);
  }

  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  const session = {
    actorId: null,
    emailAddress: "",
    isAnonymous: true,
    isConfirmed: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "",
    preferredLanguage: "en",
    userLabel: "",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
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
        viewerCanUpdate: false,
        showBoard: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/404**", (route: Route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      json: {
        error: { code: "not_found", message: "Pull request does not exist", status: 404 },
        status: 404,
      },
    }),
  );

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/404`, { waitUntil: "commit" });
    await expect(page.locator('link[href$="legacy-fallback.css"]')).toHaveCount(
      process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
    );

    const wrapper = page.locator('[data-stylex-owner="pull-request-detail-error-wrap"]');
    const icon = page.locator('[data-stylex-owner="pull-request-detail-error-icon"]');
    const message = page.locator('[data-stylex-owner="pull-request-detail-error-message"]');
    await expect(wrapper).toBeVisible();
    await expect(wrapper).toHaveClass(/error-wrap/u);
    await expect(icon).toHaveClass(/ico-err2/u);
    await expect(message).toHaveText("Page not found");
    await expect(wrapper).toHaveCSS("padding-top", "100px");
    await expect(wrapper).toHaveCSS("padding-bottom", "100px");
    await expect(wrapper).toHaveCSS("text-align", "center");
    await expect(icon).toHaveCSS("display", "inline-block");
    await expect(icon).toHaveCSS("width", "50px");
    await expect(icon).toHaveCSS("height", "80px");
    await expect(icon).toHaveCSS("background-position", "-80px -160px");
    await expect(icon).toHaveCSS("background-repeat", "no-repeat");
    await expect(icon).toHaveCSS("vertical-align", "middle");
    await expect(message).toHaveCSS("font-weight", "700");
    await expect(message).toHaveCSS("font-size", "16px");
    await expect(message).toHaveCSS("color", "rgb(137, 137, 137)");
    await expect(message).toHaveCSS("margin-top", "30px");
    await expect(message).toHaveCSS("margin-bottom", "30px");
    await expect(
      page.locator('[data-stylex-owner="pull-request-detail-error-wrap"] .ybtn'),
    ).toHaveText("List");

    const geometry = await wrapper.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(viewport.width);
    expect(geometry.height).toBeGreaterThanOrEqual(340);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height + 1);
  }

  await expect(page.locator('link[href$="legacy-fallback.css"]')).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
});
