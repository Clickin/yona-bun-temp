import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const emptyCopy = "No webhook exists.";

test.use({ locale: "en-US" });

test("project webhooks empty state preserves legacy Style parity", async ({ page }) => {
  const [routeSource, stylesSource, webhooks, partial, settingMenu, pageLess, sprites, messages] =
    await Promise.all([
      readFile(
        new URL("../src/routes/$ownerName/$projectName/webhooks.tsx", import.meta.url),
        "utf8",
      ),
      Promise.resolve(curatedAppCss()),
      readFile(
        new URL("../../yona-original/app/views/project/webhooks.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/views/project/partial_webhooks_list.scala.html",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/views/project/partial_settingmenu.scala.html",
          import.meta.url,
        ),
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

  expect(webhooks).toContain('class="project-page-wrap webhook-editor-wrap"');
  expect(webhooks).toContain("@partial_settingmenu(project)");
  expect(partial).toContain('<div class="error-wrap">');
  expect(partial).toContain('<i class="ico ico-err1"></i>');
  expect(partial).toContain('@Messages("project.webhook.list.empty")');
  expect(settingMenu).toContain('id="subMenuWebhook"');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(pageLess).toContain("font-weight:bold; font-size:16px;");
  expect(sprites).toContain(".ico-err1 {");
  expect(sprites).toContain("background-position: -5px -160px;");
  expect(sprites).toContain("width: 62px;");
  expect(sprites).toContain("height: 82px;");
  expect(messages).toContain(`project.webhook.list.empty = ${emptyCopy}`);
  expect(routeSource).toContain('import legacySpriteUrl from "../../../assets/legacy/sprite.png"');
  expect(routeSource).toContain('data-owner="project-webhooks-empty"');
  expect(routeSource).toContain('data-owner="project-webhooks-empty-icon"');
  expect(routeSource).toContain('data-owner="project-webhooks-empty-message"');
  for (const declaration of []) {
    expect(stylesSource).toContain(declaration);
  }

  await mockEmptyWebhooks(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/webhooks`, { waitUntil: "commit" });

    const pageShell = page.locator('[data-owner="project-webhooks-page"]');
    const wrap = page.locator('[data-owner="project-webhooks-empty"]');
    const icon = page.locator('[data-owner="project-webhooks-empty-icon"]');
    const message = page.locator('[data-owner="project-webhooks-empty-message"]');
    await expect(pageShell).toBeVisible();
    await expect(page.locator("#subMenuWebhook")).toHaveClass(/active/u);
    await expect(wrap).toHaveCount(1);
    await expect(wrap.locator(":scope > i + p")).toHaveCount(1);
    await expect(message).toHaveText(emptyCopy);
    await expect(icon).toHaveClass(/ico-err1/u);
    await expect(wrap).toHaveCSS("padding", "100px 0px");
    await expect(wrap).toHaveCSS("text-align", "center");
    await expect(icon).toHaveCSS("background-position", "-5px -160px");
    await expect(icon).toHaveCSS("background-repeat", "no-repeat");
    await expect(icon).toHaveCSS("background-image", /sprite[^)]*\.png/u);
    await expect(icon).toHaveCSS("display", "inline-block");
    await expect(icon).toHaveCSS("width", "62px");
    await expect(icon).toHaveCSS("height", "82px");
    await expect(icon).toHaveCSS("vertical-align", "middle");
    await expect(message).toHaveCSS("color", "rgb(137, 137, 137)");
    await expect(message).toHaveCSS("font-size", "16px");
    await expect(message).toHaveCSS("font-weight", "700");
    await expect(message).toHaveCSS("margin", "30px 0px");

    const geometry = await wrap.evaluate((element) => {
      const wrapBox = element.getBoundingClientRect();
      const pageBox = element
        .closest<HTMLElement>("[data-owner='project-webhooks-page']")
        ?.getBoundingClientRect();
      const iconBox = element.querySelector<HTMLElement>("i")?.getBoundingClientRect();
      return {
        pageLeft: pageBox?.left ?? 0,
        pageRight: pageBox?.right ?? 0,
        wrapLeft: wrapBox.left,
        wrapRight: wrapBox.right,
        iconLeft: iconBox?.left ?? 0,
        iconRight: iconBox?.right ?? 0,
      };
    });
    expect(geometry.wrapLeft).toBeGreaterThanOrEqual(geometry.pageLeft);
    expect(geometry.wrapRight).toBeLessThanOrEqual(geometry.pageRight);
    expect(geometry.iconLeft).toBeGreaterThanOrEqual(geometry.wrapLeft);
    expect(geometry.iconRight).toBeLessThanOrEqual(geometry.wrapRight);

    const fallback = page.locator('link[href*="legacy-fallback.css"]');
    await expect(fallback).toHaveCount(0);
  }
});

async function mockEmptyWebhooks(page: Page) {
  const project = {
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
  };
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-project-webhooks-error-wrap" },
      json: session,
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, fulfillSession);
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/webhooks", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        deliveries: [],
        ownerName: "admin",
        projectName: "sample",
        viewerCanCreate: false,
        viewerCanUpdate: true,
        webhookTypes: ["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"],
        webhooks: [],
      },
    }),
  );
}
