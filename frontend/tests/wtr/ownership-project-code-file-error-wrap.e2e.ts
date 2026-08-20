import { expect, test, type Page, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: fileURLToPath yields the served URL pathname so string
// mapping + .txt raw-suffix applies.
const fileURLToPath = (u: URL) => u.pathname;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const route = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", import.meta.url),
  ),
  "utf8",
);
const styles = curatedAppCss() + mergedLegacyBlock();
const legacyView = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/code/view.scala.html", import.meta.url)),
  "utf8",
);
const legacyNotFound = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/error/notfound.scala.html", import.meta.url),
  ),
  "utf8",
);
const pageLess = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const spritesLess = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_sprites.less", import.meta.url),
  ),
  "utf8",
);
const messages = readFileSync(
  fileURLToPath(new URL("../../yona-original/conf/messages", import.meta.url)),
  "utf8",
);

test("project code file not-found error wrap keeps legacy copy, paint, geometry, and fallback boundary", async ({
  page,
}) => {
  expect(legacyView).toContain(
    '@projectLayout(Messages("menu.code"), project, utils.MenuType.CODE)',
  );
  expect(legacyNotFound).toContain('<div class="error-wrap">');
  expect(legacyNotFound).toContain('<i class="ico ico-err2"></i>');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(spritesLess).toContain("background-position: -80px -160px;");
  expect(spritesLess).toContain("width: 50px;");
  expect(spritesLess).toContain("height: 80px;");
  expect(messages).toContain(
    "error.notfound.code = {0} branch does not exist. Check project default branch!",
  );

  expect(route).toContain('data-owner="project-code-file-error-wrap"');
  expect(route).toContain('data-owner="project-code-file-error-icon"');
  expect(route).toContain('data-owner="project-code-file-error-message"');

  await mockMissingCodeFile(page);
  await page.goto(`${basePath}/admin/sample/code/missing-branch/src/missing.ts`, {
    waitUntil: "networkidle",
  });

  const error = page.locator('[data-owner="project-code-file-error-wrap"]');
  await expect(error).toBeVisible();
  await expect(page.locator('[data-owner="project-code-file-error-message"]')).toHaveText(
    "missing-branch branch does not exist. Check project default branch!",
  );
  await expect(page.locator('[data-owner="project-code-file-error-list"]')).toHaveText("List");
  await expect(page.locator('[data-owner="project-code-file-error-list"]')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/settingform`,
  );

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await error.evaluate((node) => {
      const wrap = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(".ico-err2")!;
      const icon = getComputedStyle(iconNode);
      const message = getComputedStyle(node.querySelector<HTMLElement>("p")!);
      const wrapBox = node.getBoundingClientRect();
      const iconBox = iconNode.getBoundingClientRect();
      return {
        iconHeight: icon.height,
        iconInside: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
        iconPosition: icon.backgroundPosition,
        iconRepeat: icon.backgroundRepeat,
        iconWidth: icon.width,
        messageColor: message.color,
        messageFontSize: message.fontSize,
        messageMargin: message.margin,
        padding: wrap.padding,
        textAlign: wrap.textAlign,
        verticalAlign: icon.verticalAlign,
      };
    });
    expect(metrics).toEqual({
      iconHeight: "80px",
      iconInside: true,
      iconPosition: "-80px -160px",
      iconRepeat: "no-repeat",
      iconWidth: "50px",
      messageColor: "rgb(137, 137, 137)",
      messageFontSize: "16px",
      messageMargin: "30px 0px",
      padding: "100px 0px",
      textAlign: "center",
      verticalAlign: "middle",
    });
  }

  const fallback = page.locator('link[href*="legacy-fallback.css"]');
  // Post-merge: the fallback link no longer exists in index.html.
  await expect(fallback).toHaveCount(0);
});

async function mockMissingCodeFile(page: Page) {
  const session = {
    actorId: 1,
    csrfToken: "csrf-project-code-file-error-wrap",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (request: Parameters<Page["route"]>[1]) =>
    request.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": session.csrfToken },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/workspace", (request) =>
    request.fulfill({
      json: {
        organizations: [],
        projects: [],
        user: { id: 1, loginId: "admin" },
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (request) =>
    request.fulfill({
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (request) =>
    request.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "not_found", message: "Code branch not found", status: 404 },
      }),
    }),
  );
}
