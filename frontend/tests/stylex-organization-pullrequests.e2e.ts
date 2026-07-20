import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();
const closedRoute = readFileSync(
  "src/routes/organizations/$organizationName/closedPullrequests.tsx",
  "utf8",
);

test.use({ locale: "ko-KR" });

test("records organization pull request list owners and responsive containment", async ({
  page,
}) => {
  const route = readFileSync("src/routes/organizations/$organizationName/pullrequests.tsx", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const theme = readFileSync(
    "src/routes/organizations/$organizationName/-organization-pullrequests.stylex.ts",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/organization/group_pullrequest_list.scala.html",
    "utf8",
  );
  const partial = readFileSync(
    "../yona-original/app/views/organization/group_pullrequest_list_partial.scala.html",
    "utf8",
  );
  const gitPartial = readFileSync("../yona-original/app/views/git/partial_list.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(template).toContain("pullrequeset-tab-menu");
  expect(template).toContain('name="filter"');
  expect(route).not.toContain("pullrequeset-tab-menu");
  for (const selector of [
    ".pullrequeset-tab-menu > li > button {",
    ".pullrequeset-tab-menu > li > button:hover,",
    ".pullrequeset-tab-menu > li.active > button,",
  ]) {
    expect(appCss).not.toContain(selector);
  }
  expect(appCss).toContain(".nav-tabs > li > a:hover,");
  expect(appCss).toContain(".nav-tabs > li.active > a,");
  expect(route).toContain('data-stylex-owner="organization-pullrequests-tabs"');
  expect(route).toContain('data-stylex-owner="organization-pullrequests-search-input"');
  expect(closedRoute).toContain('category="closed"');
  for (const owner of [
    "organization-pullrequests-list",
    "organization-pullrequests-empty",
    "organization-pullrequests-pagination",
    "organization-pullrequests-row",
    "organization-pullrequests-row-meta",
    "organization-pullrequests-row-progress",
    "organization-pullrequests-row-progress-fill",
    "organization-pullrequests-row-state",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(theme).toContain("export const organizationPullRequestColors");
  for (const evidence of [partial, gitPartial]) {
    expect(evidence).toContain('<div class="error-wrap">');
    expect(evidence).toContain('<i class="ico ico-err1"></i>');
    expect(evidence).toContain('Messages("pullRequest.is.empty")');
  }
  expect(less).toContain("padding:100px 0px;");
  expect(less).toContain("font-weight:bold; font-size:16px;");
  expect(route).toContain('import legacySpriteUrl from "../../../assets/legacy/sprite.png"');
  expect(route).toContain('data-stylex-owner="organization-pullrequests-empty-icon"');
  expect(route).toContain('data-stylex-owner="organization-pullrequests-empty-message"');
  expect(theme).toContain('backgroundPosition: "-5px -160px"');
  expect(theme).toContain('height: "82px"');
  expect(theme).toContain('width: "62px"');
  await mockPullRequests(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/pullrequests`);
    await expect(owner(page, "organization-pullrequests-tabs")).toBeVisible();
    await expect(owner(page, "organization-pullrequests-list")).toBeVisible();
    await expect(owner(page, "organization-pullrequests-empty")).toBeVisible();
    await expect(owner(page, "organization-pullrequests-empty-icon")).toHaveCSS(
      "background-image",
      /sprite\.png/u,
    );
    await expect(owner(page, "organization-pullrequests-empty-icon")).toHaveCSS(
      "background-position",
      "-5px -160px",
    );
    await expect(owner(page, "organization-pullrequests-empty-icon")).toHaveCSS("width", "62px");
    await expect(owner(page, "organization-pullrequests-empty-icon")).toHaveCSS("height", "82px");
    await expect(owner(page, "organization-pullrequests-empty-message")).toHaveText(
      "등록된 코드 주고 받기가 없습니다.",
    );
    const emptyGeometry = await page.evaluate(() => {
      const wrap = document.querySelector<HTMLElement>(
        '[data-stylex-owner="organization-pullrequests-empty"]',
      );
      const icon = document.querySelector<HTMLElement>(
        '[data-stylex-owner="organization-pullrequests-empty-icon"]',
      );
      const message = document.querySelector<HTMLElement>(
        '[data-stylex-owner="organization-pullrequests-empty-message"]',
      );
      if (!wrap || !icon || !message) return null;
      return {
        wrap: wrap.getBoundingClientRect().toJSON(),
        icon: icon.getBoundingClientRect().toJSON(),
        message: message.getBoundingClientRect().toJSON(),
      };
    });
    expect(emptyGeometry).not.toBeNull();
    expect(emptyGeometry!.icon.width).toBe(62);
    expect(emptyGeometry!.icon.height).toBe(82);
    expect(emptyGeometry!.icon.left).toBeGreaterThanOrEqual(emptyGeometry!.wrap.left);
    expect(emptyGeometry!.icon.right).toBeLessThanOrEqual(emptyGeometry!.wrap.right);
    expect(emptyGeometry!.message.left).toBeGreaterThanOrEqual(emptyGeometry!.wrap.left);
    expect(emptyGeometry!.message.right).toBeLessThanOrEqual(emptyGeometry!.wrap.right);
    await expect(owner(page, "organization-pullrequests-search-input")).toHaveAttribute(
      "name",
      "filter",
    );
    const geometry = await owner(page, "organization-pullrequests-content").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);

    await page.goto(`${basePath}/organizations/weblabs/closedPullrequests`);
    await expect(owner(page, "organization-pullrequests-tabs")).toBeVisible();
    await expect(owner(page, "organization-pullrequests-empty")).toBeVisible();
    await expect(page).toHaveURL(/\/organizations\/weblabs\/closedPullrequests(?:\?.*)?$/);
  }
});

async function mockPullRequests(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { organizationName: "weblabs", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/pull-requests**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { items: [], openCount: 0, closedCount: 0, pageNum: 1, pageSize: 20, totalCount: 0 },
    }),
  );
}
