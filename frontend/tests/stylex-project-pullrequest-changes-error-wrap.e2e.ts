import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const generatedFallbackHref = "legacy-assets/stylesheets/legacy-fallback.css";

async function mockChangesError(page: Page, status = 404) {
  const session = {
    actorId: null,
    emailAddress: "",
    isAnonymous: true,
    isConfirmed: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "",
    userLabel: "",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: false },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/11/changes**",
    async (route: Route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ error: { status } }),
        status,
      });
    },
  );
}

test("pull-request changes error-wrap owns legacy DOM, copy, sprite, and fallback behavior", async ({
  page,
}) => {
  const [route, styles, legacy, notFound, forbidden, pageLess, sprites, messages] =
    await Promise.all([
      readFile(
        new URL(
          "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-pull-request-changes.stylex.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/views/git/viewChanges.scala.html", import.meta.url),
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

  expect(legacy).toContain('<div class="page-wrap-outer">');
  expect(notFound).toContain('<i class="ico ico-err2"></i>');
  expect(forbidden).toContain('<i class="ico ico-err2"></i>');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(sprites).toContain("background-position: -80px -160px;");
  expect(messages).toContain("error.notfound = Page not found");
  expect(messages).toContain("error.forbidden = You are not authorized");
  for (const owner of [
    "pull-request-changes-error-page",
    "pull-request-changes-error-wrap",
    "pull-request-changes-error-icon",
    "pull-request-changes-error-message",
  ])
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  for (const declaration of [
    'padding: "100px 0px"',
    'textAlign: "center"',
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
  ])
    expect(styles).toContain(declaration);

  await mockChangesError(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/11/changes?viewport=${viewport.width}`, {
      waitUntil: "commit",
    });
    await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
      process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
    );
    const wrapper = page.locator('[data-stylex-owner="pull-request-changes-error-wrap"]');
    const icon = page.locator('[data-stylex-owner="pull-request-changes-error-icon"]');
    const message = page.locator('[data-stylex-owner="pull-request-changes-error-message"]');
    await expect(wrapper).toBeVisible();
    await expect(wrapper).toHaveClass(/error-wrap/u);
    await expect(icon).toHaveClass(/ico-err2/u);
    await expect(message).toHaveText("Page not found");
    await expect(wrapper).toHaveCSS("padding", "100px 0px");
    await expect(wrapper).toHaveCSS("text-align", "center");
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
    const geometry = await wrapper.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        width: box.width,
      };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(viewport.width);
    expect(geometry.height).toBeGreaterThanOrEqual(350);
    expect(geometry.bottom).toBeGreaterThan(0);
  }
});

test("pull-request changes preserves the forbidden error branch", async ({ page }) => {
  await mockChangesError(page, 403);
  await page.goto(`${basePath}/admin/sample/pullRequest/11/changes`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="pull-request-changes-error-message"]')).toHaveText(
    "You are not authorized",
  );
});
