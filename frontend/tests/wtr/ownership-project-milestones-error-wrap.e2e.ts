import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("project milestones empty state preserves legacy error-wrap parity", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/milestones.tsx", "utf8");
  const styles = readFileSync("src/app.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/milestone/list.scala.html", "utf8");
  const projectMenu = readFileSync("../yona-original/app/views/projectMenu.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const spritesLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_sprites.less",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacy).toContain("@if(milestones == null || milestones.isEmpty){");
  expect(legacy).toContain('<div class="error-wrap">');
  expect(legacy).toContain('<i class="ico ico-err1"></i>');
  expect(legacy).toContain('@Messages("milestone.is.empty")');
  expect(legacy).toContain('@projectMenu(project, utils.MenuType.MILESTONE, "")');
  expect(legacy).toContain(
    '@projectLayout(project.name + " - " + title, project, utils.MenuType.MILESTONE)',
  );
  expect(projectMenu).toContain("@isActiveMenu(MenuType.MILESTONE)");
  expect(yobiLess).toContain('@import "less/_sprites.less";');
  expect(yobiLess).toContain('@import "less/_page.less";');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(pageLess).toContain("font-weight:bold; font-size:16px;");
  expect(pageLess).toContain("color:#898989; margin:30px 0;");
  expect(spritesLess).toContain("background-position: -5px -160px;");
  expect(spritesLess).toContain("width: 62px;");
  expect(spritesLess).toContain("height: 82px;");
  expect(messages).toContain("milestone.is.empty = No milestone entered.");
  expect(messages).toContain("milestone.menu.manage = Manage milestone");
  expect(messages).toContain("milestone.menu.new = New milestone");

  for (const declaration of []) {
    expect(styles).toContain(declaration);
  }
  for (const owner of [
    "project-milestones-empty",
    "project-milestones-empty-icon",
    "project-milestones-empty-message",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  await mockEmptyMilestones(page);
  await page.goto(`${basePath}/admin/sample/milestones?state=open`, { waitUntil: "commit" });

  const shell = page.locator('[data-owner="project-milestones-shell"]');
  const tabs = page.locator('[data-owner="project-milestones-tabs"]');
  const empty = page.locator('[data-owner="project-milestones-empty"]');
  const icon = page.locator('[data-owner="project-milestones-empty-icon"]');
  const message = page.locator('[data-owner="project-milestones-empty-message"]');

  await expect(shell).toBeVisible();
  await expect(tabs).toBeVisible();
  await expect(empty).toBeVisible();
  await expect(empty.locator(":scope > i")).toHaveCount(1);
  await expect(empty.locator(":scope > p")).toHaveCount(1);
  await expect(message).toHaveText("No milestone entered.");
  await expect(empty.locator(".filter-wrap, .milestones")).toHaveCount(0);

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(empty).toHaveCSS("padding-top", "100px");
    await expect(empty).toHaveCSS("padding-bottom", "100px");
    await expect(empty).toHaveCSS("text-align", "center");
    await expect(icon).toHaveCSS("display", "inline-block");
    await expect(icon).toHaveCSS("width", "62px");
    await expect(icon).toHaveCSS("height", "82px");
    await expect(icon).toHaveCSS("background-position", "-5px -160px");
    await expect(icon).toHaveCSS("background-repeat", "no-repeat");
    await expect(icon).toHaveCSS("vertical-align", "middle");
    await expect(message).toHaveCSS("font-weight", "700");
    await expect(message).toHaveCSS("font-size", "16px");
    await expect(message).toHaveCSS("color", "rgb(137, 137, 137)");
    await expect(message).toHaveCSS("margin-top", "30px");
    await expect(message).toHaveCSS("margin-bottom", "30px");

    const geometry = await empty.evaluate((element) => {
      const wrapBox = element.getBoundingClientRect();
      const iconBox = element.querySelector<HTMLElement>("i")!.getBoundingClientRect();
      return {
        iconInside: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
        wrapInsideViewport: wrapBox.left >= 0 && wrapBox.right <= window.innerWidth,
      };
    });
    expect(geometry).toEqual({ iconInside: true, wrapInsideViewport: true });
  }

  const fallback = page.locator('link[href*="legacy-fallback.css"]');
  await expect(fallback).toHaveCount(0);
  if (await fallback.count()) await fallback.evaluate((element) => element.remove());
  await expect(empty).toHaveCSS("padding-top", "100px");
  await expect(icon).toHaveCSS("background-position", "-5px -160px");
});

async function mockEmptyMilestones(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: "1",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
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
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
}
