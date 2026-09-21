import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (name: string) => `[data-owner="${name}"]`;
const root = owner("user-issues-pagination");

test.use({ locale: "ko-KR" });

test("user issues pagination records the full legacy source chain and local Style owners", () => {
  const route = readFileSync(new URL("../src/routes/user/issues.tsx", import.meta.url), "utf8");

  const legacyController = readFileSync(
    new URL("../../yona-original/app/controllers/IssueApp.java", import.meta.url),
    "utf8",
  );
  const legacyRoot = readFileSync(
    new URL("../../yona-original/app/views/issue/my_list.scala.html", import.meta.url),
    "utf8",
  );
  const legacySearch = readFileSync(
    new URL("../../yona-original/app/views/issue/my_partial_search.scala.html", import.meta.url),
    "utf8",
  );
  const legacyList = readFileSync(
    new URL("../../yona-original/app/views/issue/my_partial_list.scala.html", import.meta.url),
    "utf8",
  );
  const quickSearch = readFileSync(
    new URL(
      "../../yona-original/app/views/issue/my_partial_list_quicksearch.scala.html",
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

  expect(legacyController).toContain("userIssues");
  expect(legacyController).toContain("issuesAsHTML");
  expect(legacyRoot).toContain("my_partial_search");
  expect(legacySearch).toContain('id="pagination"');
  expect(legacyList).toContain('<ul class="post-list-wrap my-issues">');
  expect(quickSearch).toContain("issue.list.assignedToMe");
  expect(common).toContain(".page-navigation-wrap");
  expect(common).toContain("padding: 0 10px");
  expect(sprites).toContain(".btn-pg-prev");
  expect(sprites).toContain(".btn-pg-next");
  expect(page).toContain("margin-left: -120px !important");
  expect(responsive).toContain(".page-nums");
  expect(yobi).toContain('@import "less/_common.less";');
  expect(yobi).toContain('@import "less/_sprites.less";');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(yobi).toContain('@import "less/_responsive.less";');
  expect(messages).toContain("button.prevPage = 이전 페이지");
  expect(messages).toContain("button.nextPage = 다음 페이지");
  for (const name of [
    "user-issues-pagination",
    "user-issues-pagination-page-nums",
    "user-issues-pagination-prev-page",
    "user-issues-pagination-input",
    "user-issues-pagination-delimiter",
    "user-issues-pagination-total",
    "user-issues-pagination-next-page",
  ])
    expect(route).toContain(`data-owner="${name}"`);
});

async function openIssues(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
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
  const requestedPages: number[] = [];
  await page.route("**/api/v1/user/issues**", (route: Route) => {
    const pageNum = Number(new URL(route.request().url()).searchParams.get("pageNum") ?? "1");
    requestedPages.push(pageNum);
    return route.fulfill({
      contentType: "application/json",
      json: {
        closedIssueCount: 0,
        filter: "assigned",
        items: [
          {
            assigneeLabel: "",
            authorLabel: "Alice",
            authorLoginId: "alice",
            childClosedCount: 0,
            childOpenCount: 0,
            createdLabel: "2026-07-23",
            id: pageNum,
            issueNumber: pageNum,
            labels: [],
            ownerName: "alice",
            projectName: "sample",
            state: "open",
            title: `Issue ${pageNum}`,
            updatedLabel: "2026-07-23",
          },
        ],
        openIssueCount: 3,
        pageNum,
        pageSize: 20,
        sideFilterCounts: {},
        state: "open",
        totalCount: 45,
        totalPages: 3,
        viewerUserId: 1,
      },
    });
  });
  await page.goto(
    `${basePath}/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=1&query=needle&state=open`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.locator(root)).toBeVisible();
  return requestedPages;
}

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`populated user issues pagination preserves legacy geometry on ${viewport.name}`, async ({
    page,
  }) => {
    await openIssues(page, viewport);
    const pagination = page.locator(root);
    const list = pagination.locator(owner("user-issues-pagination-page-nums"));
    await expect(list.locator(":scope > li")).toHaveCount(5);
    await expect(list.locator(":scope > li")).toHaveText([
      "이전 페이지",
      "",
      "/",
      "3",
      "다음 페이지",
    ]);
    await expect(pagination.locator(owner("user-issues-pagination-prev-label"))).toHaveText(
      "이전 페이지",
    );
    await expect(pagination.locator(owner("user-issues-pagination-next-label"))).toHaveText(
      "다음 페이지",
    );
    await expect(pagination.locator(owner("user-issues-pagination-prev-icon"))).toHaveClass(/off/u);
    await expect(pagination.locator(owner("user-issues-pagination-next-icon"))).not.toHaveClass(
      /off/u,
    );
    await expect(pagination).toHaveCSS("clear", "both");
    await expect(pagination).toHaveCSS("margin-top", "20px");
    await expect(list).toHaveCSS("display", "inline-block");
    await expect(list).toHaveCSS("font-size", "0px");
    await expect(pagination.locator(owner("user-issues-pagination-input"))).toHaveCSS(
      "width",
      "30px",
    );
    const metrics = await page.evaluate(() => {
      const element = document.querySelector('[data-owner="user-issues-pagination"]')!;
      const pageList = document.querySelector('[data-owner="user-issues-pagination-page-nums"]')!;
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
    mkdirSync(resolve("output/playwright/style-user-issues-pagination"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        `output/playwright/style-user-issues-pagination/user-issues-pagination-${viewport.name}.png`,
      ),
    });
  });
}

test("user issues pagination preserves scoped SPA navigation and invalid/clamped Enter behavior", async ({
  page,
}) => {
  const requestedPages = await openIssues(page, { width: 1366, height: 900 });
  await page.locator(`${owner("user-issues-pagination-next-page")} a`).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => requestedPages.at(-1)).toBe(2);
  const nextUrl = new URL(page.url());
  expect(nextUrl.pathname).toBe(`${basePath}/user/issues`);
  expect(nextUrl.searchParams.get("filter")).toBe("assigned");
  expect(nextUrl.searchParams.get("orderBy")).toBe("updatedDate");
  expect(nextUrl.searchParams.get("query")).toBe("needle");
  expect(nextUrl.searchParams.get("state")).toBe("open");
  const input = page.locator(owner("user-issues-pagination-input"));
  await input.fill("1.5");
  await input.press("Enter");
  await expect(input).toHaveValue("2");
  await input.fill("99");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect.poll(() => requestedPages.at(-1)).toBe(3);
  await expect(page.locator(owner("user-issues-pagination-next-icon"))).toHaveClass(/off/u);
  await expect(page.locator(`${owner("user-issues-pagination-next-page")} a`)).toHaveCount(0);
});
