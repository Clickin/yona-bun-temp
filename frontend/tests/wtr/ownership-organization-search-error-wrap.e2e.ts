import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const route = readFileSync("src/routes/organizations/$organizationName/search.tsx", "utf8");
const styles =
  readFileSync("src/app.css", "utf8") +
  readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
const forbiddenView = readFileSync(
  "../yona-original/app/views/error/forbidden_organization.scala.html",
  "utf8",
);
const resultView = readFileSync("../yona-original/app/views/search/result.scala.html", "utf8");
const searchPartial = readFileSync(
  "../yona-original/app/views/search/partial_search.scala.html",
  "utf8",
);
const organizationIssuesPartial = readFileSync(
  "../yona-original/app/views/organization/group_issue_search_partial.scala.html",
  "utf8",
);
const organizationHeader = readFileSync(
  "../yona-original/app/views/organization/header.scala.html",
  "utf8",
);
const organizationMenu = readFileSync(
  "../yona-original/app/views/organization/menu.scala.html",
  "utf8",
);
const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
const spritesLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_sprites.less",
  "utf8",
);
const messages = readFileSync("../yona-original/conf/messages", "utf8");

test("organization search forbidden error wrap preserves legacy Style paint and geometry", async ({
  page,
}) => {
  expect(forbiddenView).toContain("@organization.header(org)");
  expect(forbiddenView).toContain("@organization.menu(org)");
  expect(forbiddenView).toContain('<div class="page-wrap-outer">');
  expect(forbiddenView).toContain('<div class="project-page-wrap">');
  expect(forbiddenView).toContain('<div class="error-wrap">');
  expect(forbiddenView).toContain('<i class="ico ico-err2"></i>');
  expect(forbiddenView).toContain("<p>@Messages(messageKey)</p>");
  expect(resultView).toContain("@partial_search(group, project, searchResult)");
  expect(searchPartial).toContain('<div class="row-fluid">');
  expect(organizationIssuesPartial).toContain('<div class="error-wrap">');
  expect(organizationHeader).toContain('<div class="project-header-outer"');
  expect(organizationMenu).toContain('<div class="project-menu-outer">');
  expect(yobiLess).toContain('@import "less/_sprites.less";');
  expect(yobiLess).toContain('@import "less/_page.less";');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(pageLess).toContain("font-weight:bold; font-size:16px;");
  expect(pageLess).toContain("color:#898989; margin:30px 0;");
  expect(spritesLess).toContain("background-position: -80px -160px;");
  expect(spritesLess).toContain("width: 50px;");
  expect(spritesLess).toContain("height: 80px;");
  expect(messages).toContain("error.forbidden = You are not authorized");
  expect(route).toContain('data-owner="organization-search-error-page"');
  expect(route).toContain('data-owner="organization-search-error-wrap"');
  expect(route).toContain('data-owner="organization-search-error-icon"');
  expect(route).toContain('data-owner="organization-search-error-message"');

  await mockForbiddenOrganizationSearch(page);
  await page.goto(`${basePath}/organizations/weblabs/search?keyword=blocked&searchType=project`, {
    waitUntil: "commit",
  });

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  const error = page.locator('[data-owner="organization-search-error-wrap"]');
  const icon = page.locator('[data-owner="organization-search-error-icon"]');
  const message = page.locator('[data-owner="organization-search-error-message"]');
  // The forbidden search result can land after the shell (route data gate);
  // poll the error wrap's paint (gate flake: toBeVisible raced the render).
  await expect
    .poll(() => error.evaluate((node) => getComputedStyle(node).display !== "none"))
    .toBe(true);
  await expect(icon).toHaveClass(/ico-err2/u);
  await expect(message).toHaveText("You are not authorized");
  await expect(error.locator(".ybtn")).toHaveCount(0);

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await error.evaluate((node) => {
      const wrap = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(".ico-err2")!;
      const iconStyle = getComputedStyle(iconNode);
      const messageNode = node.querySelector<HTMLElement>("p")!;
      const messageStyle = getComputedStyle(messageNode);
      const wrapBox = node.getBoundingClientRect();
      const iconBox = iconNode.getBoundingClientRect();
      return {
        iconHeight: iconStyle.height,
        iconInside: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
        iconPosition: iconStyle.backgroundPosition,
        iconRepeat: iconStyle.backgroundRepeat,
        iconWidth: iconStyle.width,
        messageColor: messageStyle.color,
        messageFontSize: messageStyle.fontSize,
        messageMargin: messageStyle.margin,
        padding: wrap.padding,
        textAlign: wrap.textAlign,
        verticalAlign: iconStyle.verticalAlign,
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
  await expect(fallback).toHaveCount(process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1);
});

async function mockForbiddenOrganizationSearch(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, isSiteAdmin: true, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Web labs group",
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanEnroll: false,
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/search?**", (route) =>
    route.fulfill({
      contentType: "application/json",
      status: 403,
      json: { error: "forbidden", message: "You are not authorized" },
    }),
  );
}
