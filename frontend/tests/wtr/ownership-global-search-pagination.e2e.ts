import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. resolve only builds page.screenshot paths
// (a recorded shim gap); strip leading slashes so cwd-joined src paths stay
// bare-relative for the readFileSync/readFile fixture mapping.
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths.
const mkdirSync = () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (name: string) => `[data-owner="${name}"]`;
const paginationOwners = {
  delimiter: owner("global-search-pagination-delimiter"),
  input: owner("global-search-pagination-input"),
  inputPage: owner("global-search-pagination-input-page"),
  nextIcon: owner("global-search-pagination-next-icon"),
  nextLabel: owner("global-search-pagination-next-label"),
  nextPage: owner("global-search-pagination-next-page"),
  pageNums: owner("global-search-pagination-page-nums"),
  prevIcon: owner("global-search-pagination-prev-icon"),
  prevLabel: owner("global-search-pagination-prev-label"),
  prevPage: owner("global-search-pagination-prev-page"),
  root: owner("global-search-pagination"),
  total: owner("global-search-pagination-total"),
} as const;

test.use({ locale: "ko-KR" });

test("global search issue pagination maps legacy provenance and owns every control", () => {
  const route = readFileSync("src/routes/search.tsx", "utf8");
  const styles =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const searchPartial = readFileSync(
    "../yona-original/app/views/search/partial_search.scala.html",
    "utf8",
  );
  const issuePartial = readFileSync(
    "../yona-original/app/views/search/partial_issues.scala.html",
    "utf8",
  );
  const commonLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const spritesLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_sprites.less",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");
  const rebrand = readFileSync("../docs/provenance/frontend-yoram-rebrand-2026-07-13.md", "utf8");

  expect(searchPartial).toContain("partial_issues");
  expect(issuePartial).toContain('<div id="pagination"></div>');
  expect(commonLess).toContain(".page-navigation-wrap");
  expect(commonLess).toContain(".page-nums");
  expect(pageLess).toContain(".page-nums");
  expect(responsiveLess).toContain(".page-nums");
  expect(spritesLess).toContain(".btn-pg-prev");
  expect(spritesLess).toContain(".btn-pg-next");
  expect(messages).toContain("button.prevPage = 이전 페이지");
  expect(messages).toContain("button.nextPage = 다음 페이지");
  expect(rebrand).toContain("intentional");
  expect(rebrand).toContain("Yoram");
  expect(rebrand).toContain("NAVER");

  for (const selector of Object.values(paginationOwners)) {
    // ponytail: `owner()` builds a CSS selector (brackets); the source uses the plain attribute.
    expect(route).toContain(selector.slice(1, -1));
  }
  for (const declaration of [
    "paginationWrap",
    "paginationPageNums",
    "paginationPageNum",
    "paginationIconPageNum",
    "paginationInput",
    "paginationNoSpinner",
    "paginationDelimiter",
    "paginationIcon",
    "paginationPrev",
    "paginationPrevOff",
    "paginationNext",
    "paginationNextOff",
  ]) {
  }
  expect(route).toContain("key={currentPage}");
  expect(route).toContain("searchType: result.searchType");
});

function searchResponse(pageNum: number) {
  return {
    context: { organizationName: "", ownerName: "", projectName: "" },
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
        createdLabel: "Jul 1, 2026",
        href: `${basePath}/admin/sample/issue/${10 + pageNum}`,
        id: String(42 + pageNum),
        number: String(10 + pageNum),
        ownerName: "admin",
        projectName: "sample",
        snippets: [{ highlights: [], text: `Issue page ${pageNum}` }],
        state: "open",
        title: `Issue page ${pageNum}`,
        type: "issue",
        updatedLabel: "Jul 2, 2026",
      },
    ],
    keyword: "sample",
    pageNum,
    pageSize: 20,
    requestedSearchType: "issue",
    scope: "global",
    searchType: "issue",
    totalCount: 45,
  };
}

async function mockGlobalIssueSearch(page: Page) {
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
    defaultLandingPath: "/",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const sessionPath of [
    "**/api/v1/session",
    "**/api/auth/session",
    "**/api/v1/auth/session",
  ]) {
    await page.route(sessionPath, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }

  const requestedPages: number[] = [];
  await page.route("**/api/v1/search?**", (route: Route) => {
    const url = new URL(route.request().url());
    requestedPages.push(Number(url.searchParams.get("pageNum") ?? "1"));
    return route.fulfill({
      contentType: "application/json",
      json: searchResponse(requestedPages.at(-1)!),
    });
  });
  return requestedPages;
}

async function openGlobalIssueSearch(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  const requestedPages = await mockGlobalIssueSearch(page);
  await page.goto(`${basePath}/search?keyword=sample&searchType=issue&pageNum=1`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(paginationOwners.root)).toBeVisible();
  return requestedPages;
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`global issue pagination preserves legacy ${viewport.name} geometry and overflow`, async ({
    page,
  }) => {
    await openGlobalIssueSearch(page, viewport);
    const pagination = page.locator(paginationOwners.root);
    await expect(pagination.locator(paginationOwners.pageNums)).toHaveCount(1);
    await expect(pagination.locator(`${paginationOwners.pageNums} > li`)).toHaveCount(5);
    await expect(pagination.locator(`${paginationOwners.pageNums} > li`)).toHaveText([
      "이전 페이지",
      "",
      "/",
      "3",
      "다음 페이지",
    ]);
    await expect(pagination.locator(paginationOwners.prevLabel)).toHaveText("이전 페이지");
    await expect(pagination.locator(paginationOwners.nextLabel)).toHaveText("다음 페이지");
    await expect(pagination.locator(paginationOwners.prevIcon)).toHaveClass(/off/u);
    await expect(pagination.locator(paginationOwners.nextIcon)).not.toHaveClass(/off/u);
    await expect(pagination.locator("a", { hasText: "이전 페이지" })).toHaveCount(0);
    await expect(pagination.locator("a", { hasText: "다음 페이지" })).toHaveCount(1);
    await expect(pagination).toHaveCSS("clear", "both");
    await expect(pagination).toHaveCSS("margin-top", "20px");
    await expect(pagination.locator(paginationOwners.pageNums)).toHaveCSS(
      "display",
      "inline-block",
    );
    await expect(pagination.locator(paginationOwners.pageNums)).toHaveCSS("font-size", "0px");
    await expect(pagination.locator(paginationOwners.pageNums)).toHaveCSS("margin-left", "-120px");
    await expect(pagination.locator(paginationOwners.input)).toHaveCSS("width", "30px");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.body.clientWidth,
      ),
    ).toBe(true);

    mkdirSync(resolve("output/playwright/batch-global-search-pagination"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        `output/playwright/batch-global-search-pagination/global-search-pagination-${viewport.name}.png`,
      ),
    });
  });
}

test("global issue pagination keeps SPA query navigation and input semantics", async ({ page }) => {
  const requestedPages = await openGlobalIssueSearch(page, { height: 900, width: 1366 });
  await page.evaluate(() => {
    (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker = true;
  });

  const nextLink = page.locator(`${paginationOwners.nextPage} a`, { hasText: "다음 페이지" });
  await nextLink.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect.poll(() => page.locator(paginationOwners.input).inputValue()).toBe("2");
  await expect.poll(() => requestedPages).toContain(2);
  expect(
    await page.evaluate(
      () => (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker,
    ),
  ).toBe(true);

  const input = page.locator(paginationOwners.input);
  await input.click();
  await expect(input).toBeFocused();
  await input.fill("1.5");
  await input.press("Enter");
  await expect(input).toHaveValue("2");
  await expect.poll(() => requestedPages).toContain(2);

  await input.fill("99");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect.poll(() => page.locator(paginationOwners.input).inputValue()).toBe("3");
  await expect.poll(() => requestedPages).toContain(3);
  await expect(page.locator(paginationOwners.nextIcon)).toHaveClass(/off/u);
  await expect(page.locator(paginationOwners.nextLabel)).toHaveClass(/off/u);
  await expect(page.locator(`${paginationOwners.nextPage} a`)).toHaveCount(0);

  await page.locator(`${paginationOwners.prevPage} a`, { hasText: "이전 페이지" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  expect(new URL(page.url()).searchParams.get("keyword")).toBe("sample");
  expect(new URL(page.url()).searchParams.get("searchType")).toBe("issue");

  const footer = page.locator('[data-owner="site-footer-provider"]');
  await expect(footer).toContainText("Yona authors");
  await expect(footer).not.toContainText("Yoram");
});
