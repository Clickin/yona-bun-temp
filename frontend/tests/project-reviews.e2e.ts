import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const PROJECT_OWNER_NAME = "weblabs";
const PROJECT_NAME = "portal";
const PROJECT_ROUTE = `/${PROJECT_OWNER_NAME}/${PROJECT_NAME}`;
const PROJECT_REVIEWS_ROUTE = `${PROJECT_ROUTE}/reviews`;
const PROJECT_GROUP_SEARCH_ROUTE = `/organizations/${PROJECT_OWNER_NAME}/search`;

const EXPECTED_PROJECT_REVIEWS_PAGE_WRAP = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="row-fluid issue-list-wrap"><div class="span2 search-wrap span-hard-wrap"><div class="inner advanced"><ul class="lst-stacked unstyled"><li class="active"><button type="button">All reviews<span class="num-badge pull-right">2</span></button></li><li class=""><button type="button">Participated.<span class="num-badge pull-right">1</span></button></li><li class=""><button type="button">Created<span class="num-badge pull-right">1</span></button></li></ul><form id="search" name="search" action="__PROJECT_REVIEWS_PATH__" method="get"><input type="hidden" name="authorId" value=""><input type="hidden" name="participantId" value=""><input type="hidden" name="orderDir" value="desc"><input type="hidden" name="orderBy" value="createdDate"><input type="hidden" name="state" value="open"><hr class="hide-in-mobile"><div class="search-bar span-hard-wrap"><input name="filter" class="textbox full" type="text" value="comment"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></form></div></div><div class="span10 span-hard-wrap"><div class="pull-right filters"><button type="button" class="filter" style="background:none;border:0px;color:inherit;cursor:pointer;display:inline;font:inherit;margin:0px;padding:0px;text-align:inherit;width:auto"><i class="ico btn-gray-arrow down"></i>Created</button></div><ul class="nav nav-tabs nm"><li class="active"><button type="button">Open<span class="num-badge">2</span></button></li><li class=""><button type="button">Closed<span class="num-badge">1</span></button></li></ul><div class="review-list-wrap"><ul class="post-list-wrap"><li class="post-item"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge hide-in-mobile" title="dev"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">31</span><a href="__PROJECT_BASE_PATH__/pullRequest/3/changes#thread-31" class="title">Please check this change</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><span class="infos-item item-count-groups"><a href="__PROJECT_BASE_PATH__/pullRequest/3/changes#thread-31" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">1</span></a></span></div></li><li class="post-item"><a href="__BASE_PATH__/ghost" class="avatar-wrap mlarge hide-in-mobile" title="ghost"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">32</span><a href="__PROJECT_BASE_PATH__/pullRequest/4/changes/fedcba987654#thread-32" class="title">Commit-specific pull request thread</a></div><div class="infos"><span class="infos-item">No author</span><span class="infos-item" title="Jul 2, 2026">Jul 2, 2026</span><span class="infos-item item-count-groups"><a href="__PROJECT_BASE_PATH__/pullRequest/4/changes/fedcba987654#thread-32" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">1</span></a></span></div></li></ul></div><div class="pull-left" style="padding:10px"><a href="__PROJECT_REVIEWS_PATH__?filter=comment&format=xls" class="ybtn small"><i class="yobicon-file-excel"></i> Download as Excel file</a></div><div id="pagination" class="page-navigation-wrap"><ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li><li class="page-num"><input type="number" pattern="[0-9]*" class="input-mini nospinner" name="pageNum" max="1" min="1" value="1"></li><li class="page-num delimiter">/</li><li class="page-num">1</li><li class="page-num ikon"><span class="off">Next page</span><i class="ico btn-pg-next off"></i></li></ul></div></div></div></div></div>
`;
test("SVN reviews keep the clean legacy URL and direct project-page geometry", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.addInitScript((configuredBasePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: configuredBasePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  await mockProjectReviews(page, {
    empty: true,
    ownerName: "admin",
    projectName: "svnplayground",
    vcs: "Subversion",
  });

  await page.goto(`${basePath}/admin/svnplayground/reviews`);
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/reviews`);
  await expect(page.locator(".page-wrap-outer")).toHaveCount(0);
  await expect(page.locator(".project-page-wrap")).toHaveCount(1);
  await expect(page.locator(".review-list-wrap .error-wrap")).toBeVisible();
  await expect(page.locator("#pagination.page-navigation-wrap")).toHaveCount(1);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  expect(await emptyReviewGeometry(page)).toEqual({
    documentWidth: 1366,
    height: 500,
    width: 1366,
    x: 0,
    y: 208,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/reviews`);
  expect(await emptyReviewGeometry(page)).toEqual({
    documentWidth: 390,
    height: 668,
    width: 390,
    x: 0,
    y: 208,
  });
});

test("project reviews list matches legacy reviewthread/list.scala.html shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const projectBasePath = `${basePath}${PROJECT_ROUTE}`;
  const projectReviewsPath = `${basePath}${PROJECT_REVIEWS_ROUTE}`;
  const projectGroupSearchPath = `${basePath}${PROJECT_GROUP_SEARCH_ROUTE}`;
  const allProjectsSearchPath = `${basePath}/search`;
  await auditNativeClickListeners(page);
  const requests = await mockProjectReviews(page);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);

  await expect(page).toHaveTitle("portal - Review - weblabs/portal");
  await expect(page.locator(".gnb-outer.project-header")).toBeVisible();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${projectBasePath}/search`,
  );
  expect(await projectHeaderMetrics(page)).toEqual({
    headerClassName: "gnb-outer project-header",
    searchAction: `${projectBasePath}/search`,
    searchBoxClassName: "search-box select",
    searchBoxContainedInHeader: true,
    searchBoxInsideSearchForm: true,
    searchFormContainedInHeader: true,
    searchScopeContainedInHeader: true,
  });
  await page.locator("#gnb-search-scope-title").click();
  const searchScopeItems = page.locator(".gnb-search-form .dropdown-menu button");
  await expect(searchScopeItems).toHaveText(["This Project", "This Group", "All Projects"]);
  await searchScopeItems.nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    projectGroupSearchPath,
  );
  await page.locator("#gnb-search-scope-title").click();
  await searchScopeItems.nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    allProjectsSearchPath,
  );
  await page.locator("#gnb-search-scope-title").click();
  await searchScopeItems.nth(0).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${projectBasePath}/search`,
  );
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Review");
  await expect(page.locator(".review-list-wrap .post-item")).toHaveCount(2);
  await expect(page.locator(".review-list-wrap .post-item").first().locator(".title")).toHaveText(
    "Please check this change",
  );
  await expect(page.locator(".review-list-wrap .post-item").nth(1).locator(".infos")).toContainText(
    "No author",
  );
  const exportLink = page.locator('.pull-left a.ybtn.small[href$="format=xls"]');
  await expect(exportLink).toHaveText("Download as Excel file");
  await expect(exportLink).toHaveAttribute(
    "href",
    `${projectReviewsPath}?filter=comment&format=xls`,
  );

  await page.goto(
    `${projectReviewsPath}?state=open&filter=comment&pageNum=3&orderBy=createdDate&orderDir=asc`,
  );
  await expect(page.locator('.pull-left a.ybtn.small[href$="format=xls"]')).toHaveAttribute(
    "href",
    `${projectReviewsPath}?orderDir=asc&filter=comment&format=xls`,
  );
  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);

  expect(await canonicalize(page, ".project-page-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_REVIEWS_PAGE_WRAP.replaceAll("__BASE_PATH__", basePath)
        .replaceAll("__PROJECT_BASE_PATH__", projectBasePath)
        .replaceAll("__PROJECT_REVIEWS_PATH__", projectReviewsPath)
        .replace(/^\s*<div class="page-wrap-outer">/u, "")
        .replace(/<\/div>\s*$/u, ""),
    ),
  );
  expect(await reviewListMetrics(page)).toEqual({
    activeSidebarButtonContained: true,
    contentStartsAfterSidebar: true,
    exportTopAfterList: true,
    filterRightAligned: true,
    leftColumnWidth: 191,
    listStartsBelowTabs: true,
    paginationAfterExport: true,
    rowCount: 2,
    rowPaddingBlock: 20,
    searchAction: projectReviewsPath,
    searchBarStartsInSidebar: true,
    searchInputContainedInSearchBar: true,
    searchInputWidth: 169,
    stateTabBorderBottomColor: "rgba(0, 0, 0, 0)",
    stateTabDisplay: "block",
    stateTabLineHeight: "20px",
    stateTabPadding: "8px 30px",
    tabsStartAtContentLeft: true,
    titleOverflow: "hidden",
    titleTextOverflow: "ellipsis",
    titleWhiteSpace: "nowrap",
  });
  await expect(page.locator('.lst-stacked a[href="#"]')).toHaveCount(0);
  await expect(page.locator('.filters a[href="#"]')).toHaveCount(0);
  await expect(page.locator('.nav-tabs a[href="#"]')).toHaveCount(0);
  await expect(page.locator('.lst-stacked button[type="button"]')).toHaveCount(3);
  await expect(page.locator(".lst-stacked li.active button")).toHaveText("All reviews2");
  await expect(
    page.locator(".lst-stacked button").filter({ hasText: "Participated." }),
  ).toBeVisible();
  await expect(page.locator(".lst-stacked button").filter({ hasText: "Created" })).toBeVisible();
  await expect(page.locator(".filters button.filter")).toHaveText("Created");
  await expect(page.locator(".span10 > .nav-tabs li.active button")).toHaveText("Open2");
  await expect(
    page.locator(".span10 > .nav-tabs button").filter({ hasText: "Closed" }),
  ).toBeVisible();
  await expect(page.locator(".lst-stacked button[data-toggle]")).toHaveCount(0);
  await expect(page.locator(".lst-stacked button[data-value]")).toHaveCount(0);
  await expect(page.locator(".lst-stacked button[data-type]")).toHaveCount(0);
  await expect(page.locator(".filters button[data-toggle]")).toHaveCount(0);
  await expect(page.locator(".filters button[data-field]")).toHaveCount(0);
  await expect(page.locator(".filters button[data-value]")).toHaveCount(0);
  await expect(page.locator(".span10 > .nav-tabs button[data-toggle]")).toHaveCount(0);
  await expect(page.locator(".span10 > .nav-tabs button[data-value]")).toHaveCount(0);
  await expect(page.locator(".span10 > .nav-tabs button[data-type]")).toHaveCount(0);
  await expect(page.locator('.review-list-wrap [data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator(".review-list-wrap .avatar-wrap").first()).toHaveAttribute(
    "title",
    "dev",
  );
  await expect(page.locator(".review-list-wrap .avatar-wrap").first()).not.toHaveAttribute(
    "data-placement",
  );
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).toHaveAttribute(
    "title",
    "dev",
  );
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).toHaveText("Dev Member");
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).not.toHaveAttribute(
    "data-placement",
  );
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".infos-item").nth(1),
  ).toHaveAttribute("title", "Jul 1, 2026");
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".infos-item").nth(1),
  ).toHaveText("Jul 1, 2026");
  await expect(page.locator(".review-list-wrap [data-placement]")).toHaveCount(0);
  expect(
    await nativeClickListenerCount(page, ".lst-stacked button, .filters button, .nav-tabs button"),
  ).toBe(0);
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".title"),
  ).toHaveAttribute("href", `${projectBasePath}/pullRequest/3/changes#thread-31`);
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".comments-count"),
  ).toHaveAttribute("href", `${projectBasePath}/pullRequest/3/changes#thread-31`);
  await expect(
    page.locator(".review-list-wrap .post-item").nth(1).locator(".title"),
  ).toHaveAttribute("href", `${projectBasePath}/pullRequest/4/changes/fedcba987654#thread-32`);
  await expect(
    page.locator(".review-list-wrap .post-item").nth(1).locator(".comments-count"),
  ).toHaveAttribute("href", `${projectBasePath}/pullRequest/4/changes/fedcba987654#thread-32`);

  const titleSpaMarker = `review-title-${Date.now()}`;
  await page.evaluate((marker) => {
    (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker = marker;
  }, titleSpaMarker);
  await page.locator(".review-list-wrap .post-item").first().locator(".title").click();
  await expect(page).toHaveURL(
    new RegExp(`${escapeRegExp(projectBasePath)}/pullRequest/3/changes#thread-31$`, "u"),
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).toBe(titleSpaMarker);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);
  const commentsSpaMarker = `review-comments-${Date.now()}`;
  await page.evaluate((marker) => {
    (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker = marker;
  }, commentsSpaMarker);
  await page.locator(".review-list-wrap .post-item").first().locator(".comments-count").click();
  await expect(page).toHaveURL(
    new RegExp(`${escapeRegExp(projectBasePath)}/pullRequest/3/changes#thread-31$`, "u"),
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).toBe(commentsSpaMarker);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);
  const commitSpecificSpaMarker = `review-commit-specific-${Date.now()}`;
  await page.evaluate((marker) => {
    (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker = marker;
  }, commitSpecificSpaMarker);
  await page.locator(".review-list-wrap .post-item").nth(1).locator(".title").click();
  await expect(page).toHaveURL(
    new RegExp(
      `${escapeRegExp(projectBasePath)}/pullRequest/4/changes/fedcba987654#thread-32$`,
      "u",
    ),
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).toBe(commitSpecificSpaMarker);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);
  const commitSpecificCommentsSpaMarker = `review-commit-comments-${Date.now()}`;
  await page.evaluate((marker) => {
    (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker = marker;
  }, commitSpecificCommentsSpaMarker);
  await page.locator(".review-list-wrap .post-item").nth(1).locator(".comments-count").click();
  await expect(page).toHaveURL(
    new RegExp(
      `${escapeRegExp(projectBasePath)}/pullRequest/4/changes/fedcba987654#thread-32$`,
      "u",
    ),
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).toBe(commitSpecificCommentsSpaMarker);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);
  const spaMarker = `reviews-${Date.now()}`;
  await page.evaluate((marker) => {
    (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker = marker;
  }, spaMarker);
  await page.locator(".lst-stacked button").filter({ hasText: "Participated." }).click();
  await expect(page).toHaveURL(/participantId=1/u);
  await expect(page).not.toHaveURL(/orderBy=/u);
  await expect(page).not.toHaveURL(/orderDir=/u);
  await expect(page).not.toHaveURL(/state=/u);
  await expect(page).not.toHaveURL(/pageNum=/u);
  expect(
    await page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).toBe(spaMarker);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);
  await page.locator(".filters button.filter").click();
  await expect(page).not.toHaveURL(/orderBy=/u);
  await expect(page).toHaveURL(/orderDir=asc/u);
  await expect(page).not.toHaveURL(/state=/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(
    `${projectReviewsPath}?state=open&filter=comment&orderBy=createdDate&orderDir=asc`,
  );
  await page.locator(".filters button.filter").click();
  await expect(page).not.toHaveURL(/orderBy=/u);
  await expect(page).not.toHaveURL(/orderDir=/u);
  await expect(page).not.toHaveURL(/state=/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(
    `${projectReviewsPath}?state=open&filter=comment&orderBy=createdDate&orderDir=desc`,
  );
  await page.locator(".filters button.filter").click();
  await expect(page).not.toHaveURL(/orderBy=/u);
  await expect(page).toHaveURL(/orderDir=asc/u);
  await expect(page).not.toHaveURL(/state=/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);
  await page.locator(".span10 > .nav-tabs button").filter({ hasText: "Closed" }).click();
  await expect(page).toHaveURL(/state=closed/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(`${projectReviewsPath}?state=open`);
  await page.locator('#search input[name="filter"]').fill("needle");
  await page.locator("#search").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page).toHaveURL(/filter=needle/u);

  expect(requests.some((url) => url.searchParams.get("filter") === "comment")).toBe(true);
});

test("project reviews tooltip markers are not React-owned DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const projectBasePath = `${basePath}${PROJECT_ROUTE}`;
  const projectReviewsPath = `${basePath}${PROJECT_REVIEWS_ROUTE}`;
  await mockProjectReviews(page);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);

  await expect(page.locator(".review-list-wrap .post-item")).toHaveCount(2);
  await expect(page.locator('.review-list-wrap [data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator(".review-list-wrap .avatar-wrap").first()).toHaveAttribute(
    "title",
    "dev",
  );
  await expect(page.locator(".review-list-wrap .avatar-wrap").first()).not.toHaveAttribute(
    "data-placement",
  );
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).toHaveAttribute(
    "title",
    "dev",
  );
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).toHaveText("Dev Member");
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).not.toHaveAttribute(
    "data-placement",
  );
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".infos-item").nth(1),
  ).toHaveAttribute("title", "Jul 1, 2026");
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".infos-item").nth(1),
  ).toHaveText("Jul 1, 2026");
  await expect(page.locator(".review-list-wrap [data-placement]")).toHaveCount(0);
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".title"),
  ).toHaveAttribute("href", `${projectBasePath}/pullRequest/3/changes#thread-31`);

  const source = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
  const rowSource = source.slice(
    source.indexOf("function ProjectReviewRow("),
    source.indexOf("function ProjectReviewPagination("),
  );
  expect(rowSource).not.toContain('data-toggle="tooltip"');
  expect(rowSource).not.toContain("data-placement=");
});

test("project review row source uses TanStack Link for internal row navigation", () => {
  const source = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
  const rowSource = source.slice(
    source.indexOf("function ProjectReviewRow("),
    source.indexOf("function ProjectReviewPagination("),
  );

  expect(rowSource).toContain("<Link");
  expect(rowSource).not.toContain("<a");
  expect(rowSource).not.toContain('data-toggle="tooltip"');
  expect(rowSource).not.toContain("threadHref");
  expect(rowSource).not.toContain("prefixBasePath(basePath");
});

test("project reviews export source uses TanStack Link href", () => {
  const source = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
  const exportSource = source.slice(
    source.indexOf('<div className="pull-left"'),
    source.indexOf("<ProjectReviewPagination"),
  );

  expect(exportSource).toContain("<Link");
  expect(exportSource).toContain("href={`${action}${exportQuery}`}");
  expect(exportSource).toContain("to={`${baseRoute}${exportQuery}`}");
  expect(exportSource).toContain("reloadDocument");
  expect(exportSource).not.toContain("<a");
});

test("project reviews title source renders legacy projectLayout title", () => {
  const source = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");

  expect(source).toContain(
    '<title>{`${projectName} - ${t("menu.review")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(source).not.toContain("useProjectReviewsDocumentTitle");
  expect(source).not.toContain("document.title");
});

test("project reviews filter/order source omits legacy delegated-handler hooks", () => {
  const source = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");

  expect(source).not.toContain('data-toggle="filter"');
  expect(source).not.toContain('data-toggle="order"');
  expect(source).not.toContain("data-value=");
  expect(source).not.toContain("data-field=");
  expect(source).not.toContain('data-type="participantId"');
  expect(source).not.toContain('data-type="authorId"');
  expect(source).not.toContain('data-type="state"');
  expect(source).not.toContain("dataset.value");
});

async function emptyReviewGeometry(page: Page) {
  return page.locator(".project-page-wrap").evaluate((projectPage) => {
    const rect = projectPage.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      height: Math.round(rect.height),
      width: Math.round(rect.width),
      x: Math.round(rect.x),
      y: Math.round(rect.y),
    };
  });
}

async function mockProjectReviews(
  page: Page,
  options: { empty?: boolean; ownerName?: string; projectName?: string; vcs?: string } = {},
) {
  const ownerName = options.ownerName ?? PROJECT_OWNER_NAME;
  const projectName = options.projectName ?? PROJECT_NAME;
  const requests: URL[] = [];
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          backgroundImageUrl: "/assets/images/bg-default-project.png",
          enrollmentRequestCount: 0,
          id: 7,
          isFavorite: false,
          isPrivate: false,
          isProtected: true,
          logoUrl: "/assets/images/project_default_logo.png",
          menuSetting: {
            board: true,
            code: true,
            issue: true,
            milestone: true,
            pullRequest: true,
            review: true,
          },
          organizationName: ownerName,
          ownerName,
          projectName,
          vcs: options.vcs ?? "GIT",
          viewerCanUpdate: true,
          viewerUserId: 1,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/reviews**`,
    async (route) => {
      requests.push(new URL(route.request().url()));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          allCount: options.empty ? 0 : 2,
          authorCount: options.empty ? 0 : 1,
          closedCount: options.empty ? 0 : 1,
          items: options.empty
            ? []
            : [
                {
                  authorAvatarUrl: "/assets/images/default-avatar-32.png",
                  authorId: 2,
                  authorLabel: "Dev Member",
                  authorLoginId: "dev",
                  comments: [
                    {
                      authorAvatarUrl: "/assets/images/default-avatar-32.png",
                      authorId: 2,
                      authorLabel: "Dev Member",
                      authorLoginId: "dev",
                      contentsMarkdown: "Please check this change",
                      createdLabel: "Jul 1, 2026",
                      id: 1001,
                      threadId: 31,
                    },
                    {
                      authorAvatarUrl: "/assets/images/default-avatar-32.png",
                      authorId: 1,
                      authorLabel: "Site Admin",
                      authorLoginId: "admin",
                      contentsMarkdown: "Follow-up",
                      createdLabel: "Jul 1, 2026",
                      id: 1002,
                      threadId: 31,
                    },
                  ],
                  commitId: "",
                  createdLabel: "Jul 1, 2026",
                  id: 31,
                  path: "",
                  pullRequestNumber: 3,
                  state: "open",
                },
                {
                  authorAvatarUrl: "/assets/images/default-avatar-32.png",
                  authorId: 9,
                  authorLabel: "",
                  authorLoginId: "ghost",
                  comments: [
                    {
                      authorAvatarUrl: "/assets/images/default-avatar-32.png",
                      authorId: 9,
                      authorLabel: "",
                      authorLoginId: "ghost",
                      contentsMarkdown: "Commit-specific pull request thread",
                      createdLabel: "Jul 2, 2026",
                      id: 2001,
                      threadId: 32,
                    },
                    {
                      authorAvatarUrl: "/assets/images/default-avatar-32.png",
                      authorId: 1,
                      authorLabel: "Site Admin",
                      authorLoginId: "admin",
                      contentsMarkdown: "Ack",
                      createdLabel: "Jul 2, 2026",
                      id: 2002,
                      threadId: 32,
                    },
                  ],
                  commitId: "fedcba987654",
                  createdLabel: "Jul 2, 2026",
                  id: 32,
                  path: "src/commit-specific-thread.rs",
                  pullRequestNumber: 4,
                  startLine: 9,
                  startSide: "B",
                  state: "open",
                },
              ],
          openCount: options.empty ? 0 : 2,
          pageNum: 1,
          pageSize: 15,
          participantCount: options.empty ? 0 : 1,
          state: "open",
          totalCount: 2,
        }),
      });
    },
  );
  return requests;
}

async function auditNativeClickListeners(page: Page) {
  await page.addInitScript(() => {
    const clickListenerCounts = new WeakMap<EventTarget, number>();
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === "click") {
        clickListenerCounts.set(this, (clickListenerCounts.get(this) ?? 0) + 1);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    (
      window as Window & {
        __nativeClickListenerCount?: (selector: string) => number;
      }
    ).__nativeClickListenerCount = (selector: string) =>
      Array.from(document.querySelectorAll(selector)).reduce(
        (total, element) => total + (clickListenerCounts.get(element) ?? 0),
        0,
      );
  });
}

async function nativeClickListenerCount(page: Page, selector: string) {
  return page.evaluate((input) => {
    const counter = (
      window as Window & {
        __nativeClickListenerCount?: (selector: string) => number;
      }
    ).__nativeClickListenerCount;
    if (!counter) {
      throw new Error("Native click listener audit was not installed");
    }
    return counter(input);
  }, selector);
}

async function projectHeaderMetrics(page: Page) {
  return page.evaluate(() => {
    const header = requireElement(".gnb-outer");
    const searchForm = requireElement<HTMLFormElement>('form[name="gnb-search-form"]');
    const searchScope = requireElement<HTMLButtonElement>("#gnb-search-scope-title");
    const searchBox = requireElement(".gnb-search-form .search-box");
    const headerRect = header.getBoundingClientRect();
    const searchFormRect = searchForm.getBoundingClientRect();
    const searchScopeRect = searchScope.getBoundingClientRect();
    const searchBoxRect = searchBox.getBoundingClientRect();

    return {
      headerClassName: header.className,
      searchAction: searchForm.getAttribute("action"),
      searchBoxClassName: searchBox.className,
      searchBoxContainedInHeader:
        searchBoxRect.top >= headerRect.top && searchBoxRect.bottom <= headerRect.bottom,
      searchBoxInsideSearchForm:
        searchBoxRect.left >= searchFormRect.left && searchBoxRect.right <= searchFormRect.right,
      searchFormContainedInHeader:
        searchFormRect.top >= headerRect.top && searchFormRect.bottom <= headerRect.bottom,
      searchScopeContainedInHeader:
        searchScopeRect.top >= headerRect.top && searchScopeRect.bottom <= headerRect.bottom,
    };

    function requireElement<T extends HTMLElement = HTMLElement>(selector: string) {
      const element = document.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function reviewListMetrics(page: Page) {
  return page.evaluate(() => {
    const leftColumn = requireElement(".issue-list-wrap .search-wrap");
    const contentColumn = requireElement(".issue-list-wrap > .span10");
    const activeSidebarButton = requireElement(".lst-stacked li.active button");
    const searchForm = requireElement<HTMLFormElement>("#search");
    const searchBar = requireElement("#search .search-bar");
    const searchInput = requireElement<HTMLInputElement>('#search input[name="filter"]');
    const filters = requireElement(".issue-list-wrap .filters");
    const tabs = requireElement(".issue-list-wrap .nav-tabs");
    const stateTab = requireElement<HTMLButtonElement>(".nav-tabs li.active button");
    const firstRow = requireElement(".review-list-wrap .post-item");
    const titleWrap = requireElement(".review-list-wrap .post-item .title-wrap");
    const list = requireElement(".review-list-wrap");
    const exportLink = requireElement('.pull-left a[href$="format=xls"]');
    const pagination = requireElement("#pagination");
    const leftColumnBox = leftColumn.getBoundingClientRect();
    const contentColumnBox = contentColumn.getBoundingClientRect();
    const activeSidebarButtonBox = activeSidebarButton.getBoundingClientRect();
    const searchBarBox = searchBar.getBoundingClientRect();
    const filtersBox = filters.getBoundingClientRect();
    const tabsBox = tabs.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    const exportBox = exportLink.getBoundingClientRect();
    const paginationBox = pagination.getBoundingClientRect();
    const firstRowStyle = getComputedStyle(firstRow);
    const titleStyle = getComputedStyle(titleWrap);
    const stateTabStyle = getComputedStyle(stateTab);

    return {
      activeSidebarButtonContained:
        activeSidebarButtonBox.left >= leftColumnBox.left &&
        activeSidebarButtonBox.right <= leftColumnBox.right,
      contentStartsAfterSidebar: contentColumnBox.left > leftColumnBox.right,
      exportTopAfterList: exportBox.top > listBox.top,
      filterRightAligned:
        filtersBox.right <= contentColumnBox.right && filtersBox.left > tabsBox.left,
      leftColumnWidth: Math.round(leftColumnBox.width),
      listStartsBelowTabs: listBox.top > tabsBox.top,
      paginationAfterExport: paginationBox.top >= exportBox.top,
      rowCount: document.querySelectorAll(".review-list-wrap .post-item").length,
      rowPaddingBlock:
        Math.round(parseFloat(firstRowStyle.paddingTop)) +
        Math.round(parseFloat(firstRowStyle.paddingBottom)),
      searchAction: searchForm.getAttribute("action"),
      searchBarStartsInSidebar: searchBarBox.left >= leftColumnBox.left,
      searchInputContainedInSearchBar:
        searchInput.getBoundingClientRect().left >= searchBarBox.left &&
        searchInput.getBoundingClientRect().right <= searchBarBox.right,
      searchInputWidth: Math.round(searchInput.getBoundingClientRect().width),
      stateTabBorderBottomColor: stateTabStyle.borderBottomColor,
      stateTabDisplay: stateTabStyle.display,
      stateTabLineHeight: stateTabStyle.lineHeight,
      stateTabPadding: stateTabStyle.padding,
      tabsStartAtContentLeft: tabsBox.left === contentColumnBox.left,
      titleOverflow: titleStyle.overflow,
      titleTextOverflow: titleStyle.textOverflow,
      titleWhiteSpace: titleStyle.whiteSpace,
    };

    function requireElement<T extends HTMLElement = HTMLElement>(selector: string) {
      const element = document.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
      }
      return attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
      }
      return attr.value;
    }
  }, html);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
