// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (name: string) => `[data-owner="${name}"]`;
const root = owner("organization-issues-pagination");

test.use({ locale: "ko-KR" });

test("organization issue pagination records full legacy provenance and route-local declarations", () => {
  const route = readFileSync(
    new URL("../src/routes/organizations/$organizationName/issues.tsx", import.meta.url),
    "utf8",
  );

  const legacyRoot = readFileSync(
    new URL(
      "../../yona-original/app/views/organization/group_issue_list.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const legacyPartial = readFileSync(
    new URL(
      "../../yona-original/app/views/organization/group_issue_search_partial.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const listPartial = readFileSync(
    new URL(
      "../../yona-original/app/views/organization/group_issue_list_partial.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const quickSearch = readFileSync(
    new URL(
      "../../yona-original/app/views/organization/group_issue_list_quicksearch.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const common = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
    "utf8",
  );
  const sprites = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_sprites.less", import.meta.url),
    "utf8",
  );
  const page = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const responsive = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
    "utf8",
  );
  const yobi = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
    "utf8",
  );
  const messages = readFileSync(
    new URL("../../yona-original/conf/messages.ko-KR", import.meta.url),
    "utf8",
  );

  expect(legacyRoot).toContain("group_issue_search_partial");
  expect(legacyPartial).toContain('id="pagination"');
  expect(listPartial).toContain('<ul class="post-list-wrap">');
  expect(quickSearch).toContain("issue.list.all");
  expect(common).toContain(".page-navigation-wrap");
  expect(common).toContain("padding: 0 10px");
  expect(sprites).toContain(".btn-pg-prev");
  expect(sprites).toContain(".btn-pg-next");
  expect(page).toContain(".page-nums");
  expect(responsive).toContain(".page-nums");
  expect(yobi).toContain('@import "less/_common.less";');
  expect(yobi).toContain('@import "less/_sprites.less";');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(messages).toContain("button.prevPage = 이전 페이지");
  expect(messages).toContain("button.nextPage = 다음 페이지");
  for (const name of [
    "organization-issues-pagination",
    "organization-issues-pagination-page-nums",
    "organization-issues-pagination-prev-page",
    "organization-issues-pagination-input",
    "organization-issues-pagination-delimiter",
    "organization-issues-pagination-total",
    "organization-issues-pagination-next-page",
  ])
    expect(route).toContain(`data-owner="${name}"`);
});

async function mockOrganizationIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  for (const path of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(path, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { actorId: "1", isAnonymous: false },
      }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { organizationName: "weblabs", viewerCanUpdate: true, visibleProjects: [] },
    }),
  );
  const requestedPages: number[] = [];
  await page.route("**/api/v1/organizations/weblabs/issues**", (route: Route) => {
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("pageNum") ?? "1");
    requestedPages.push(pageNum);
    return route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        items: [
          {
            id: String(pageNum),
            title: `Issue ${pageNum}`,
            issueNumber: pageNum,
            ownerName: "weblabs",
            projectName: "sample",
            authorLoginId: "admin",
            authorLabel: "Admin",
            createdLabel: "Jul 23, 2026",
            labels: [],
            commentCount: 0,
            voterCount: 0,
          },
        ],
        pageNum,
        pageSize: 20,
        totalCount: 45,
        totalPages: 3,
        openIssueCount: 45,
        closedIssueCount: 0,
        visibleProjects: [],
        filter: "bug",
        orderBy: "createdDate",
        orderDir: "desc",
        state: "open",
        projectNames: [],
      },
    });
  });
  return requestedPages;
}

async function openIssues(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  const requestedPages = await mockOrganizationIssues(page);
  await page.goto(
    `${basePath}/organizations/weblabs/issues?filter=bug&state=open&orderBy=createdDate&orderDir=desc&pageNum=1`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.locator(root)).toBeVisible();
  return requestedPages;
}

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`populated organization issue pagination preserves legacy geometry on ${viewport.name}`, async ({
    page,
  }) => {
    await openIssues(page, viewport);
    const pagination = page.locator(root);
    const list = pagination.locator(owner("organization-issues-pagination-page-nums"));
    await expect(list.locator(":scope > li")).toHaveCount(5);
    await expect(list.locator(":scope > li")).toHaveText([
      "이전 페이지",
      "",
      "/",
      "3",
      "다음 페이지",
    ]);
    await expect(pagination.locator(owner("organization-issues-pagination-prev-label"))).toHaveText(
      "이전 페이지",
    );
    await expect(pagination.locator(owner("organization-issues-pagination-next-label"))).toHaveText(
      "다음 페이지",
    );
    await expect(pagination.locator(owner("organization-issues-pagination-prev-icon"))).toHaveClass(
      /off/u,
    );
    await expect(
      pagination.locator(owner("organization-issues-pagination-next-icon")),
    ).not.toHaveClass(/off/u);
    await expect(pagination).toHaveCSS("clear", "both");
    await expect(pagination).toHaveCSS("margin-top", "20px");
    await expect(list).toHaveCSS("display", "inline-block");
    await expect(list).toHaveCSS("font-size", "0px");
    await expect(pagination.locator(owner("organization-issues-pagination-input"))).toHaveCSS(
      "width",
      "30px",
    );
    const metrics = await page.evaluate(() => {
      const element = document.querySelector('[data-owner="organization-issues-pagination"]')!;
      const pageList = document.querySelector(
        '[data-owner="organization-issues-pagination-page-nums"]',
      )!;
      const box = element.getBoundingClientRect();
      const listBox = pageList.getBoundingClientRect();
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
    mkdirSync(resolve("output/playwright/style-organization-issues-pagination"), {
      recursive: true,
    });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        `output/playwright/style-organization-issues-pagination/organization-issues-pagination-${viewport.name}.png`,
      ),
    });
  });
}

test("organization issue pagination preserves scoped SPA navigation and clamps Enter", async ({
  page,
}) => {
  const requestedPages = await openIssues(page, { width: 1366, height: 900 });
  await page.locator(`${owner("organization-issues-pagination-next-page")} a`).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => requestedPages.at(-1)).toBe(2);
  const nextUrl = new URL(page.url());
  expect(nextUrl.pathname).toBe(`${basePath}/organizations/weblabs/issues`);
  expect(nextUrl.searchParams.get("filter")).toBe("bug");
  expect(nextUrl.searchParams.get("state")).toBe("open");
  const input = page.locator(owner("organization-issues-pagination-input"));
  await input.fill("1.5");
  await input.press("Enter");
  await expect(input).toHaveValue("2");
  await input.fill("99");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect.poll(() => requestedPages.at(-1)).toBe(3);
  await expect(page.locator(owner("organization-issues-pagination-next-icon"))).toHaveClass(/off/u);
  await expect(page.locator(`${owner("organization-issues-pagination-next-page")} a`)).toHaveCount(
    0,
  );
});
