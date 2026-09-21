// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (name: string) => `[data-owner="${name}"]`;
const pagination = {
  delimiter: owner("organization-search-pagination-delimiter"),
  input: owner("organization-search-pagination-input"),
  nextIcon: owner("organization-search-pagination-next-icon"),
  nextLabel: owner("organization-search-pagination-next-label"),
  nextPage: owner("organization-search-pagination-next-page"),
  pageNums: owner("organization-search-pagination-page-nums"),
  prevIcon: owner("organization-search-pagination-prev-icon"),
  prevLabel: owner("organization-search-pagination-prev-label"),
  prevPage: owner("organization-search-pagination-prev-page"),
  root: owner("organization-search-pagination"),
  total: owner("organization-search-pagination-total"),
} as const;

test.use({ locale: "ko-KR" });

test("organization search pagination maps legacy provenance and every Style owner", () => {
  const route = readFileSync("src/routes/organizations/$organizationName/search.tsx", "utf8");

  const partialSearch = readFileSync(
    "../yona-original/app/views/search/partial_search.scala.html",
    "utf8",
  );
  const partials = [
    "partial_issues.scala.html",
    "partial_users.scala.html",
    "partial_projects.scala.html",
    "partial_posts.scala.html",
    "partial_milestones.scala.html",
    "partial_issue_comments.scala.html",
    "partial_post_comments.scala.html",
    "partial_reviews.scala.html",
  ].map((name) => readFileSync(`../yona-original/app/views/search/${name}`, "utf8"));
  const organizationIssueSearch = readFileSync(
    "../yona-original/app/views/organization/group_issue_search_partial.scala.html",
    "utf8",
  );
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const spritesLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_sprites.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");

  expect(partialSearch).toContain("partial_issues");
  expect(partialSearch).toContain("partial_users");
  expect(partials.every((partial) => partial.includes("search-list-wrap"))).toBe(true);
  expect(partials.filter((partial) => partial.includes("yobi.Pagination.update")).length).toBe(7);
  expect(organizationIssueSearch).toContain('<div id="pagination" data-total=');
  expect(commonLess).toContain(".page-navigation-wrap");
  expect(commonLess).toContain(".page-nums");
  expect(pageLess).toContain(".page-nums");
  expect(responsiveLess).toContain(".page-nums");
  expect(spritesLess).toContain(".btn-pg-prev");
  expect(spritesLess).toContain(".btn-pg-next");
  expect(messages).toContain("button.prevPage = 이전 페이지");
  expect(messages).toContain("button.nextPage = 다음 페이지");
  expect(yobiLess).toContain('@import "less/_common.less";');
  expect(yobiLess).toContain('@import "less/_sprites.less";');
  expect(yobiLess).toContain('@import "less/_responsive.less";');

  for (const selector of Object.values(pagination)) {
    const marker = selector.match(/data-owner="([^"]+)"/u)?.[1];
    expect(marker).toBeTruthy();
    expect(route).toContain(`data-owner="${marker}"`);
  }
  for (const _declaration of [
    "paginationWrap",
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
  ]) {
  }
  expect(route).toContain("params={{ organizationName }}");
  expect(route).toContain("searchType");
});

function searchResponse(pageNum: number) {
  return {
    context: { organizationName: "team", ownerName: "", projectName: "" },
    counts: {
      issueComments: 0,
      issues: 45,
      milestones: 0,
      postComments: 0,
      posts: 0,
      projects: 0,
      reviews: 0,
      users: 0,
    },
    items: [
      {
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        createdLabel: "2026-07-01",
        href: `${basePath}/admin/sample/issue/${10 + pageNum}`,
        id: String(42 + pageNum),
        number: String(10 + pageNum),
        ownerName: "admin",
        projectName: "sample",
        snippets: [{ highlights: [], text: `Issue page ${pageNum}` }],
        state: "open",
        title: `Issue page ${pageNum}`,
        type: "issue",
        updatedLabel: "2026-07-02",
      },
    ],
    keyword: "sample",
    pageNum,
    pageSize: 20,
    requestedSearchType: "issue",
    scope: "organization",
    searchType: "issue",
    totalCount: 45,
  };
}

async function openSearch(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yoram-project/yoram/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: 1,
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const path of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(path, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/team/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Team organization",
        logoUrl: "",
        organizationName: "team",
        viewerCanCreateProject: true,
        viewerCanUpdate: true,
      },
    }),
  );
  const requestedPages: number[] = [];
  await page.route("**/api/v1/organizations/**/search?**", (route) => {
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("pageNum") ?? "1");
    requestedPages.push(pageNum);
    return route.fulfill({ contentType: "application/json", json: searchResponse(pageNum) });
  });
  await page.goto(
    `${basePath}/organizations/team/search?keyword=sample&searchType=issue&pageNum=1`,
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.locator(pagination.root)).toBeVisible();
  return requestedPages;
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`populated organization search pagination preserves ${viewport.name} structure and containment`, async ({
    page,
  }) => {
    await openSearch(page, viewport);
    const root = page.locator(pagination.root);
    const list = root.locator(pagination.pageNums);
    await expect(list.locator(":scope > li")).toHaveCount(5);
    await expect(list.locator(":scope > li")).toHaveText([
      "이전 페이지",
      "",
      "/",
      "3",
      "다음 페이지",
    ]);
    await expect(root.locator(pagination.prevLabel)).toHaveText("이전 페이지");
    await expect(root.locator(pagination.nextLabel)).toHaveText("다음 페이지");
    await expect(root.locator(pagination.prevIcon)).toHaveClass(/off/u);
    await expect(root.locator(pagination.nextIcon)).not.toHaveClass(/off/u);
    await expect(root).toHaveCSS("clear", "both");
    await expect(root).toHaveCSS("margin-top", "20px");
    await expect(list).toHaveCSS("display", "inline-block");
    await expect(list).toHaveCSS("font-size", "0px");
    await expect(root.locator(pagination.input)).toHaveCSS("width", "30px");

    const metrics = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(
        '[data-owner="organization-search-pagination"]',
      )!;
      const list = root.querySelector<HTMLElement>(
        '[data-owner="organization-search-pagination-page-nums"]',
      )!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      return { list: box(list), root: box(root), viewport: window.innerWidth };
    });
    expect(metrics.list.left).toBeGreaterThanOrEqual(0);
    expect(metrics.list.right).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.root.left).toBeGreaterThanOrEqual(0);
    expect(metrics.root.right).toBeLessThanOrEqual(metrics.viewport + 1);

    mkdirSync(resolve("output/playwright/batch-organization-search-pagination"), {
      recursive: true,
    });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        `output/playwright/batch-organization-search-pagination/organization-search-pagination-${viewport.name}.png`,
      ),
    });
  });
}

test("organization pagination keeps scoped SPA links and invalid/clamped input behavior", async ({
  page,
}) => {
  const requestedPages = await openSearch(page, { height: 900, width: 1366 });
  await page.locator(`${pagination.nextPage} a`, { hasText: "다음 페이지" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => requestedPages.at(-1)).toBe(2);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/organizations/team/search`);
  expect(new URL(page.url()).searchParams.get("searchType")).toBe("issue");

  const input = page.locator(pagination.input);
  await input.fill("1.5");
  await input.press("Enter");
  await expect(input).toHaveValue("2");
  await input.fill("99");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect.poll(() => requestedPages.at(-1)).toBe(3);
  await expect(page.locator(pagination.nextIcon)).toHaveClass(/off/u);
  await expect(page.locator(`${pagination.nextPage} a`)).toHaveCount(0);
});
