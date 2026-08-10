import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const route = readFileSync("../src/routes/$ownerName/$projectName.tsx", "utf8");
const styles =
  readFileSync("src/app.css", "utf8") +
  readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
const legacy = readFileSync(
  "../yona-original/app/views/error/internalServerError_default.scala.html",
  "utf8",
);
const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
const spritesLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_sprites.less",
  "utf8",
);
const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
const messages = readFileSync("../yona-original/conf/messages", "utf8");

test("project post edit internal error owns frozen legacy error-wrap styles", async ({ page }) => {
  expect(legacy).toContain('<div class="error-wrap">');
  expect(legacy).toContain('<i class="ico-404"></i>');
  expect(legacy).toContain("<p>@Messages(messageKey)</p>");
  expect(legacy).toContain('@Messages("menu.home")');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(spritesLess).toContain("background-position: -80px -160px;");
  expect(spritesLess).toContain("width: 50px;");
  expect(spritesLess).toContain("height: 80px;");
  expect(yobiLess).toContain('@import "less/_sprites.less";');
  expect(yobiLess).toContain('@import "less/_page.less";');
  expect(messages).toContain(
    "error.internalServerError = Server error occurred; service is not available",
  );
  expect(messages).toContain("menu.home = Home");

  expect(route).toContain('data-owner="project-post-edit-internal-error-wrap"');
  expect(route).toContain('data-owner="project-post-edit-internal-error-icon"');
  expect(route).toContain('data-owner="project-post-edit-internal-error-message"');
  expect(route).toContain('data-owner="project-post-edit-internal-error-home"');

  await mockMissingPost(page);
  await page.goto(`${basePath}/admin/sample/post/404/editform`, { waitUntil: "networkidle" });
  const error = page.locator('[data-owner="project-post-edit-internal-error-wrap"]');
  await expect(error).toBeVisible();
  await expect(error.locator("p")).toHaveText("Server error occurred; service is not available");
  await expect(error.locator(".ico-404")).toHaveCount(1);
  await expect(error.locator("a.ybtn.ybtn-primary")).toHaveText("Home");
  await expect(error.locator(":scope > *")).toHaveCount(3);

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await error.evaluate((node) => {
      const wrap = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(".ico-404")!;
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
  if (process.env.VITE_DISABLE_LEGACY_FALLBACK === "1") await expect(fallback).toHaveCount(0);
  else await expect(fallback).toHaveCount(1);
});

async function mockMissingPost(page: Page) {
  const session = {
    actorId: 1,
    csrfToken: "csrf-project-post-edit-internal-error",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const project = {
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (request) =>
    request.fulfill({ json: project }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/404**", (request) =>
    request.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "not_found", message: "Post does not exist", status: 404 },
      }),
    }),
  );
}
