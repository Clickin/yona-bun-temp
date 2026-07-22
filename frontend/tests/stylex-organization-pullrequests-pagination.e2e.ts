import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (name: string) => `[data-stylex-owner="${name}"]`;
const root = owner("organization-pullrequests-pagination");

test.use({ locale: "ko-KR" });

test("organization pull-request pagination records full legacy provenance", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const route = read("../src/routes/organizations/$organizationName/pullrequests.tsx");
  const styles = read(
    "../src/routes/organizations/$organizationName/-organization-pullrequests.stylex.ts",
  );
  const legacyRoot = read(
    "../../yona-original/app/views/organization/group_pullrequest_list.scala.html",
  );
  const legacyPartial = read(
    "../../yona-original/app/views/organization/group_pullrequest_list_partial.scala.html",
  );
  const common = read("../../yona-original/app/assets/stylesheets/less/_common.less");
  const sprites = read("../../yona-original/app/assets/stylesheets/less/_sprites.less");
  const page = read("../../yona-original/app/assets/stylesheets/less/_page.less");
  const responsive = read("../../yona-original/app/assets/stylesheets/less/_responsive.less");
  const yobi = read("../../yona-original/app/assets/stylesheets/yobi.less");
  const messages = read("../../yona-original/conf/messages.ko-KR");

  expect(legacyRoot).toContain("group_pullrequest_list_partial");
  expect(legacyPartial).toContain('<div id="pagination"></div>');
  expect(common).toContain(".page-navigation-wrap");
  expect(common).toContain("padding: 0 10px");
  expect(sprites).toContain(".btn-pg-prev");
  expect(sprites).toContain(".btn-pg-next");
  expect(page).toContain("margin-left: -120px !important");
  expect(responsive).toContain(".page-nums");
  for (const importLine of ["_common.less", "_sprites.less", "_page.less", "_responsive.less"])
    expect(yobi).toContain(`@import "less/${importLine}";`);
  expect(messages).toContain("button.prevPage = 이전 페이지");
  expect(messages).toContain("button.nextPage = 다음 페이지");
  for (const name of [
    "organization-pullrequests-pagination",
    "organization-pullrequests-pagination-page-nums",
    "organization-pullrequests-pagination-prev-page",
    "organization-pullrequests-pagination-input",
    "organization-pullrequests-pagination-delimiter",
    "organization-pullrequests-pagination-total",
    "organization-pullrequests-pagination-next-page",
  ])
    expect(route).toContain(`data-stylex-owner="${name}"`);
  for (const declaration of [
    "paginationRoot",
    "paginationPageNums",
    "paginationPageNum",
    "paginationIconPageNum",
    "paginationIconLabel",
    "paginationIconLabelOff",
    "paginationDelimiter",
    "paginationInput",
    "paginationNoSpinner",
    "paginationIcon",
    "paginationPrev",
    "paginationPrevOff",
    "paginationNext",
    "paginationNextOff",
  ])
    expect(styles).toContain(`${declaration}:`);
});

async function mockOrganizationPullRequests(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  for (const path of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(path, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { isAnonymous: false, loginId: "admin" },
      }),
    );
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { organizationName: "weblabs", viewerCanUpdate: true, visibleProjects: [] },
    }),
  );
  const requestedPages: number[] = [];
  await page.route("**/api/v1/organizations/weblabs/pull-requests**", (route: Route) => {
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("pageNum") ?? "1");
    requestedPages.push(pageNum);
    return route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            id: pageNum,
            title: `Pull request ${pageNum}`,
            pullRequestNumber: pageNum,
            ownerName: "weblabs",
            projectName: "sample",
            contributorLoginId: "admin",
            contributorLabel: "Admin",
            createdLabel: "2026-07-23",
            receiverLoginId: "",
            receiverLabel: "",
            reviewerCount: 0,
            reviewerNames: [],
            state: "open",
            conflict: false,
            closedCommentThreadCount: 0,
            commentThreadCount: 0,
            fromBranch: "main",
            fromOwnerName: "weblabs",
            fromProjectName: "sample",
            toBranch: "main",
            updatedLabel: "2026-07-23",
          },
        ],
        openCount: 3,
        closedCount: 3,
        pageNum,
        pageSize: 1,
        totalCount: 3,
      },
    });
  });
  return requestedPages;
}

async function openPullRequests(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  const requestedPages = await mockOrganizationPullRequests(page);
  await page.goto(`${basePath}/organizations/weblabs/pullrequests?filter=bug&pageNum=1`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(root)).toBeVisible();
  return requestedPages;
}

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`populated organization pull-request pagination preserves legacy geometry on ${viewport.name}`, async ({
    page,
  }) => {
    await openPullRequests(page, viewport);
    const pagination = page.locator(root);
    const list = pagination.locator(owner("organization-pullrequests-pagination-page-nums"));
    await expect(list.locator(":scope > li")).toHaveCount(5);
    await expect(list.locator(":scope > li")).toHaveText([
      "이전 페이지",
      "",
      "/",
      "3",
      "다음 페이지",
    ]);
    await expect(
      pagination.locator(owner("organization-pullrequests-pagination-prev-label")),
    ).toHaveText("이전 페이지");
    await expect(
      pagination.locator(owner("organization-pullrequests-pagination-next-label")),
    ).toHaveText("다음 페이지");
    await expect(
      pagination.locator(owner("organization-pullrequests-pagination-prev-icon")),
    ).toHaveClass(/off/u);
    await expect(
      pagination.locator(owner("organization-pullrequests-pagination-next-icon")),
    ).not.toHaveClass(/off/u);
    await expect(pagination).toHaveCSS("clear", "both");
    await expect(pagination).toHaveCSS("margin-top", "20px");
    await expect(list).toHaveCSS("display", "inline-block");
    await expect(list).toHaveCSS("font-size", "0px");
    await expect(pagination.locator(owner("organization-pullrequests-pagination-input"))).toHaveCSS(
      "width",
      "30px",
    );
    const metrics = await page.evaluate(() => {
      const pagination = document.querySelector<HTMLElement>(
        "[data-stylex-owner='organization-pullrequests-pagination']",
      )!;
      const list = document.querySelector<HTMLElement>(
        "[data-stylex-owner='organization-pullrequests-pagination-page-nums']",
      )!;
      const box = pagination.getBoundingClientRect();
      const listBox = list.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        listLeft: listBox.left,
        listRight: listBox.right,
        width: innerWidth,
        overflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth ||
          document.body.scrollWidth > document.body.clientWidth,
      };
    });
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(metrics.width + 1);
    expect(metrics.listLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.listRight).toBeLessThanOrEqual(metrics.width + 1);
    expect(metrics.overflow).toBe(false);
    mkdirSync(resolve("output/playwright/stylex-organization-pullrequests-pagination"), {
      recursive: true,
    });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        `output/playwright/stylex-organization-pullrequests-pagination/organization-pullrequests-pagination-${viewport.name}.png`,
      ),
    });
  });
}

test("organization pull-request pagination preserves scoped SPA navigation, category route, and Enter clamping", async ({
  page,
}) => {
  const requestedPages = await openPullRequests(page, { width: 1366, height: 900 });
  await page.locator(`${owner("organization-pullrequests-pagination-next-page")} a`).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => requestedPages.at(-1)).toBe(2);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/organizations/weblabs/pullrequests`);
  expect(new URL(page.url()).searchParams.get("filter")).toBe("bug");
  await page.locator(owner("organization-pullrequests-pagination-input")).fill("1.5");
  await page.locator(owner("organization-pullrequests-pagination-input")).press("Enter");
  await expect(page.locator(owner("organization-pullrequests-pagination-input"))).toHaveValue("2");
  await page.locator(owner("organization-pullrequests-pagination-input")).fill("99");
  await page.locator(owner("organization-pullrequests-pagination-input")).press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(page.locator(owner("organization-pullrequests-pagination-next-icon"))).toHaveClass(
    /off/u,
  );
  await page.locator(owner("organization-pullrequests-tab")).nth(1).click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath}/organizations/weblabs/closedPullrequests`);
});
