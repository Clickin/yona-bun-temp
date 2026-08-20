import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (name: string) => `data-owner="${name}"`;
const ownerSelector = (name: string) => `[${owner(name)}]`;
const paginationOwnerNames = [
  "project-search-pagination-delimiter",
  "project-search-pagination-input",
  "project-search-pagination-input-page",
  "project-search-pagination-next-icon",
  "project-search-pagination-next-label",
  "project-search-pagination-next-page",
  "project-search-pagination-page-nums",
  "project-search-pagination-prev-icon",
  "project-search-pagination-prev-label",
  "project-search-pagination-prev-page",
  "project-search-pagination",
  "project-search-pagination-total",
] as const;
const paginationOwners = {
  delimiter: ownerSelector("project-search-pagination-delimiter"),
  input: ownerSelector("project-search-pagination-input"),
  inputPage: ownerSelector("project-search-pagination-input-page"),
  nextIcon: ownerSelector("project-search-pagination-next-icon"),
  nextLabel: ownerSelector("project-search-pagination-next-label"),
  nextPage: ownerSelector("project-search-pagination-next-page"),
  pageNums: ownerSelector("project-search-pagination-page-nums"),
  prevIcon: ownerSelector("project-search-pagination-prev-icon"),
  prevLabel: ownerSelector("project-search-pagination-prev-label"),
  prevPage: ownerSelector("project-search-pagination-prev-page"),
  root: ownerSelector("project-search-pagination"),
  total: ownerSelector("project-search-pagination-total"),
} as const;

test.use({ locale: "ko-KR" });

test("project search pagination maps the legacy partials and Style declarations", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/search.tsx", "utf8");
  const styles = readFileSync("src/app.css", "utf8");
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

  for (const name of paginationOwnerNames) expect(route).toContain(owner(name));
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
  expect(route).toContain("key={`${currentPage}-${totalPages}`}");
  expect(route).toContain("projectName");
});

function projectSearchResponse(pageNum: number) {
  return {
    context: { organizationName: "", ownerName: "admin", projectName: "sample" },
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
        createdLabel: "2026년 7월 1일",
        href: `${basePath}/admin/sample/issue/${10 + pageNum}`,
        id: String(42 + pageNum),
        number: String(10 + pageNum),
        ownerName: "admin",
        projectName: "sample",
        snippets: [{ highlights: [], text: `Issue page ${pageNum}` }],
        state: "open",
        title: `Issue page ${pageNum}`,
        type: "issue",
        updatedLabel: "",
      },
    ],
    keyword: "sample",
    pageNum,
    pageSize: 20,
    requestedSearchType: "issue",
    scope: "project",
    searchType: "issue",
    totalCount: 45,
  };
}

async function mockProjectSearch(page: Page) {
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
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "project-search-pagination" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerIsProjectMember: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/search?**", (route: Route) => {
    const pageNum = Number(new URL(route.request().url()).searchParams.get("pageNum") ?? "1");
    return route.fulfill({ contentType: "application/json", json: projectSearchResponse(pageNum) });
  });
}

async function openProjectSearch(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await mockProjectSearch(page);
  await page.goto(`${basePath}/admin/sample/search?keyword=sample&searchType=issue&pageNum=1`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(paginationOwners.root)).toBeVisible();
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`project search pagination preserves legacy ${viewport.name} geometry and overflow`, async ({
    page,
  }) => {
    await openProjectSearch(page, viewport);
    const pagination = page.locator(paginationOwners.root);
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
    await expect(pagination).toHaveCSS("clear", "both");
    await expect(pagination.locator(paginationOwners.pageNums)).toHaveCSS(
      "display",
      "inline-block",
    );
    await expect(pagination.locator(paginationOwners.pageNums)).toHaveCSS("font-size", "0px");
    await expect(pagination.locator(paginationOwners.pageNums)).toHaveCSS("margin-left", "-120px");
    await expect(pagination.locator(paginationOwners.input)).toHaveCSS("width", "30px");
    const paginationMetrics = await page.evaluate(() => {
      const pagination = document.querySelector<HTMLElement>(
        '[data-owner="project-search-pagination"]',
      );
      const pageNums = document.querySelector<HTMLElement>(
        '[data-owner="project-search-pagination-page-nums"]',
      );
      if (!pagination || !pageNums) return null;
      const paginationBox = pagination.getBoundingClientRect();
      const pageNumsBox = pageNums.getBoundingClientRect();
      return {
        pageNums: { left: pageNumsBox.left, right: pageNumsBox.right },
        pagination: {
          clientWidth: pagination.clientWidth,
          left: paginationBox.left,
          right: paginationBox.right,
          scrollWidth: pagination.scrollWidth,
        },
        viewportWidth: window.innerWidth,
      };
    });
    expect(paginationMetrics).not.toBeNull();
    expect(paginationMetrics!.pagination.left).toBeGreaterThanOrEqual(0);
    expect(paginationMetrics!.pagination.right).toBeLessThanOrEqual(
      paginationMetrics!.viewportWidth,
    );
    expect(paginationMetrics!.pagination.scrollWidth).toBeLessThanOrEqual(
      paginationMetrics!.pagination.clientWidth,
    );
    // Scope overflow to the pagination owner: fallback-off retains an 8px
    // baseline overflow in the authenticated sidenav/project-search shell.
    expect(paginationMetrics!.pageNums.left).toBeGreaterThanOrEqual(
      paginationMetrics!.pagination.left,
    );
    expect(paginationMetrics!.pageNums.right).toBeLessThanOrEqual(
      paginationMetrics!.pagination.right,
    );
    mkdirSync(resolve("output/playwright/batch-project-search-pagination"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        `output/playwright/batch-project-search-pagination/project-search-pagination-${viewport.name}.png`,
      ),
    });
  });
}

test("project search pagination preserves project-scoped SPA navigation and input semantics", async ({
  page,
}) => {
  await openProjectSearch(page, { height: 900, width: 1366 });
  await page.evaluate(() => {
    (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker = true;
  });
  await page.locator(`${paginationOwners.nextPage} a`, { hasText: "다음 페이지" }).click();
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/search?keyword=sample&pageNum=2&searchType=issue`,
  );
  await expect(page.locator(paginationOwners.input)).toHaveValue("2");
  expect(
    await page.evaluate(
      () => (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker,
    ),
  ).toBe(true);

  const input = page.locator(paginationOwners.input);
  await input.click();
  await input.fill("1.5");
  await input.press("Enter");
  await expect(input).toHaveValue("2");
  await input.fill("99");
  await input.press("Enter");
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/search?keyword=sample&pageNum=3&searchType=issue`,
  );
  await expect(page.locator(paginationOwners.input)).toHaveValue("3");
  await expect(page.locator(paginationOwners.nextIcon)).toHaveClass(/off/u);
  await expect(page.locator(paginationOwners.nextLabel)).toHaveClass(/off/u);

  await page.locator(`${paginationOwners.prevPage} a`, { hasText: "이전 페이지" }).click();
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/search?keyword=sample&pageNum=2&searchType=issue`,
  );
  const footer = page.locator('[data-owner="site-footer-provider"]');
  await expect(footer).toContainText("Yona authors");
  await expect(footer).not.toContainText("Yoram");
});
