import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackHref = "legacy-assets/stylesheets/legacy-fallback.css";

test("pull-request editform error-wrap preserves both legacy branches and StyleX parity", async ({
  page,
}) => {
  const [route, styles, edit, notFound, forbidden, yobi, pageLess, sprites, responsive, messages] =
    await Promise.all([
      readFile(
        new URL(
          "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-editform.stylex.ts",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/views/git/edit.scala.html", import.meta.url),
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
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
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
      readFile(
        new URL(
          "../../yona-original/app/assets/stylesheets/less/_responsive.less",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    ]);

  expect(edit).toContain('<div class="page-wrap-outer">');
  expect(edit).toContain('<div class="project-page-wrap">');
  expect(notFound).toContain('<i class="ico ico-err2"></i>');
  expect(forbidden).toContain('<i class="ico ico-err2"></i>');
  expect(yobi).toContain('@import "less/_sprites.less";');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(sprites).toContain("background-position: -80px -160px;");
  expect(sprites).toContain("width: 50px;");
  expect(sprites).toContain("height: 80px;");
  expect(responsive).toContain(".page-wrap-outer {");
  expect(responsive).toContain("width: 100%;");
  expect(messages).toContain("error.notfound = Page not found");
  expect(messages).toContain("error.forbidden = You are not authorized");
  for (const owner of [
    "pull-request-edit-error-page",
    "pull-request-edit-error-wrap",
    "pull-request-edit-error-icon",
    "pull-request-edit-error-message",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
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

  await mockEditErrors(page);
  for (const branch of [
    { number: 11, message: "You are not authorized" },
    { number: 12, message: "Page not found" },
  ]) {
    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`${basePath}/admin/sample/pullRequest/${branch.number}/editform`, {
        waitUntil: "commit",
      });
      await expect(page.locator(`link[href$="${fallbackHref}"]`)).toHaveCount(
        process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
      );

      const pageOwner = page.locator('[data-stylex-owner="pull-request-edit-error-page"]');
      const wrap = page.locator('[data-stylex-owner="pull-request-edit-error-wrap"]');
      const icon = page.locator('[data-stylex-owner="pull-request-edit-error-icon"]');
      const message = page.locator('[data-stylex-owner="pull-request-edit-error-message"]');
      await expect(pageOwner).toBeVisible();
      await expect(wrap).toBeVisible();
      await expect(wrap).toHaveClass(/error-wrap/u);
      await expect(icon).toHaveClass(/ico-err2/u);
      await expect(message).toHaveText(branch.message);
      await expect(wrap.locator("a, button")).toHaveCount(0);

      const evidence = await wrap.evaluate((node) => {
        const iconNode = node.querySelector<HTMLElement>("i")!;
        const messageNode = node.querySelector<HTMLElement>("p")!;
        const wrapStyle = getComputedStyle(node);
        const iconStyle = getComputedStyle(iconNode);
        const messageStyle = getComputedStyle(messageNode);
        const wrapBox = node.getBoundingClientRect();
        const iconBox = iconNode.getBoundingClientRect();
        return {
          order: [...node.children].map((child) => child.tagName.toLowerCase()),
          icon: {
            backgroundPosition: iconStyle.backgroundPosition,
            backgroundRepeat: iconStyle.backgroundRepeat,
            display: iconStyle.display,
            height: iconStyle.height,
            inside: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
            width: iconStyle.width,
            verticalAlign: iconStyle.verticalAlign,
          },
          message: {
            color: messageStyle.color,
            fontSize: messageStyle.fontSize,
            fontWeight: messageStyle.fontWeight,
            margin: messageStyle.margin,
          },
          wrap: {
            bottom: wrapBox.bottom,
            left: wrapBox.left,
            padding: wrapStyle.padding,
            right: wrapBox.right,
            textAlign: wrapStyle.textAlign,
          },
        };
      });
      expect(evidence.order).toEqual(["i", "p"]);
      expect(evidence.icon).toEqual({
        backgroundPosition: "-80px -160px",
        backgroundRepeat: "no-repeat",
        display: "inline-block",
        height: "80px",
        inside: true,
        width: "50px",
        verticalAlign: "middle",
      });
      expect(evidence.message).toEqual({
        color: "rgb(137, 137, 137)",
        fontSize: "16px",
        fontWeight: "700",
        margin: "30px 0px",
      });
      expect(evidence.wrap.padding).toBe("100px 0px");
      expect(evidence.wrap.textAlign).toBe("center");
      expect(evidence.wrap.left).toBeGreaterThanOrEqual(0);
      expect(evidence.wrap.right).toBeLessThanOrEqual(viewport.width);
      expect(evidence.wrap.bottom).toBeGreaterThan(0);
    }
  }
});

async function mockEditErrors(page: Page) {
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
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/*/form-options",
    (route: Route) => {
      const number = Number(new URL(route.request().url()).pathname.split("/").at(-2));
      const status = number === 11 ? 403 : 404;
      return route.fulfill({
        contentType: "application/json",
        status,
        json: { error: { code: status === 403 ? "forbidden" : "not_found", status } },
      });
    },
  );
}
