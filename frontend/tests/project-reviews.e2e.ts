import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const PROJECT_OWNER_NAME = "weblabs";
const PROJECT_NAME = "portal";
const PROJECT_ROUTE = `/${PROJECT_OWNER_NAME}/${PROJECT_NAME}`;
const PROJECT_REVIEWS_ROUTE = `${PROJECT_ROUTE}/reviews`;
const PROJECT_GROUP_SEARCH_ROUTE = `/organizations/${PROJECT_OWNER_NAME}/search`;

const EXPECTED_PROJECT_REVIEWS_PAGE_WRAP = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="row-fluid issue-list-wrap"><div class="span2 search-wrap span-hard-wrap"><div class="inner advanced"><ul class="lst-stacked unstyled"><li class="active"><button type="button" data-toggle="filter" style="background:none;border:0px;color:inherit;cursor:pointer;display:block;font:inherit;margin:0px;padding:0px;text-align:inherit;width:100%">All reviews<span class="num-badge pull-right">2</span></button></li><li class=""><button type="button" data-toggle="filter" data-type="participantId" data-value="1" style="background:none;border:0px;color:inherit;cursor:pointer;display:block;font:inherit;margin:0px;padding:0px;text-align:inherit;width:100%">Participated.<span class="num-badge pull-right">1</span></button></li><li class=""><button type="button" data-toggle="filter" data-type="authorId" data-value="1" style="background:none;border:0px;color:inherit;cursor:pointer;display:block;font:inherit;margin:0px;padding:0px;text-align:inherit;width:100%">Created<span class="num-badge pull-right">1</span></button></li></ul><form id="search" name="search" action="__PROJECT_REVIEWS_PATH__" method="get"><input type="hidden" name="authorId" value=""><input type="hidden" name="participantId" value=""><input type="hidden" name="orderDir" value="desc"><input type="hidden" name="orderBy" value="createdDate"><input type="hidden" name="state" value="open"><hr class="hide-in-mobile"><div class="search-bar span-hard-wrap"><input name="filter" class="textbox full" type="text" value="comment"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></form></div></div><div class="span10 span-hard-wrap"><div class="pull-right filters"><button type="button" data-field="createdDate" data-value="asc" class="filter" data-toggle="order" style="background:none;border:0px;color:inherit;cursor:pointer;display:inline;font:inherit;margin:0px;padding:0px;text-align:inherit;width:auto"><i class="ico btn-gray-arrow down"></i>Created</button></div><ul class="nav nav-tabs nm"><li class="active"><button type="button" data-type="state" data-value="open" data-toggle="filter" style="background:rgb(255,255,255);border-style:solid;border-width:1px;border-color:rgb(221,221,221)rgb(221,221,221)transparent;border-radius:4px4px0px0px;color:rgb(85,85,85);cursor:default;display:block;font-family:inherit;font-size:inherit;font-weight:bold;line-height:20px;margin:0px2px0px0px;padding:8px30px;text-align:inherit;width:100%">Open<span class="num-badge">2</span></button></li><li class=""><button type="button" data-type="state" data-value="closed" data-toggle="filter" style="background:transparent;border-style:solid;border-width:1px;border-color:transparent;border-radius:4px4px0px0px;color:rgb(53,146,181);cursor:pointer;display:block;font-family:inherit;font-size:inherit;font-weight:bold;line-height:20px;margin:0px2px0px0px;padding:8px30px;text-align:inherit;width:100%">Closed<span class="num-badge">1</span></button></li></ul><div class="review-list-wrap"><ul class="post-list-wrap"><li class="post-item"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">31</span><a href="__PROJECT_BASE_PATH__/pullRequest/3/changes#thread-31" class="title">Please check this change</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><span class="infos-item item-count-groups"><a href="__PROJECT_BASE_PATH__/pullRequest/3/changes#thread-31" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">1</span></a></span></div></li><li class="post-item"><a href="__BASE_PATH__/ghost" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="top" title="ghost"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><div class="title-wrap"><span class="post-id">32</span><a href="__PROJECT_BASE_PATH__/pullRequest/4/changes/fedcba987654#thread-32" class="title">Commit-specific pull request thread</a></div><div class="infos"><span class="infos-item">No author</span><span class="infos-item" title="Jul 2, 2026">Jul 2, 2026</span><span class="infos-item item-count-groups"><a href="__PROJECT_BASE_PATH__/pullRequest/4/changes/fedcba987654#thread-32" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">1</span></a></span></div></li></ul></div><div class="pull-left" style="padding:10px"><a href="__PROJECT_REVIEWS_PATH__?state=open&filter=comment&format=xls" class="ybtn small"><i class="yobicon-file-excel"></i> Download as Excel file</a></div><div id="pagination"></div></div></div></div></div>
`;

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
  const searchScopeItems = page.locator(
    '.gnb-search-form .dropdown-menu button[data-toggle="search-scope"]',
  );
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
    `${projectReviewsPath}?state=open&filter=comment&format=xls`,
  );

  await page.goto(
    `${projectReviewsPath}?state=open&filter=comment&pageNum=3&orderBy=createdDate&orderDir=asc`,
  );
  await expect(page.locator('.pull-left a.ybtn.small[href$="format=xls"]')).toHaveAttribute(
    "href",
    `${projectReviewsPath}?orderDir=asc&orderBy=createdDate&state=open&filter=comment&format=xls`,
  );
  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_REVIEWS_PAGE_WRAP.replaceAll("__BASE_PATH__", basePath)
        .replaceAll("__PROJECT_BASE_PATH__", projectBasePath)
        .replaceAll("__PROJECT_REVIEWS_PATH__", projectReviewsPath),
    ),
  );
  expect(await reviewListMetrics(page)).toEqual({
    exportTopAfterList: true,
    leftColumnWidth: 188,
    rowCount: 2,
    rowPaddingBlock: 20,
    searchAction: projectReviewsPath,
    searchInputWidth: 156,
    stateTabBorderBottomColor: "rgba(0, 0, 0, 0)",
    stateTabLineHeight: "20px",
    stateTabPadding: "8px 30px",
    titleOverflow: "hidden",
    titleTextOverflow: "ellipsis",
    titleWhiteSpace: "nowrap",
  });
  await expect(page.locator('.lst-stacked a[href="#"]')).toHaveCount(0);
  await expect(page.locator('.filters a[href="#"]')).toHaveCount(0);
  await expect(page.locator('.nav-tabs a[href="#"]')).toHaveCount(0);
  await expect(
    page.locator('.lst-stacked button[type="button"][data-toggle="filter"]'),
  ).toHaveCount(3);
  await expect(
    page.locator('.lst-stacked button[data-type="participantId"][data-value="1"]'),
  ).toHaveText("Participated.1");
  await expect(page.locator('.filters button.filter[data-toggle="order"]')).toHaveText("Created");
  await expect(page.locator('.filters button.filter[data-field="createdDate"]')).toHaveAttribute(
    "data-value",
    "asc",
  );
  await expect(page.locator('.nav-tabs button[data-type="state"][data-value="open"]')).toHaveText(
    "Open2",
  );
  await expect(page.locator('.nav-tabs button[data-type="state"][data-value="closed"]')).toHaveText(
    "Closed1",
  );
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
  await page.locator('.lst-stacked button[data-type="participantId"]').click();
  await expect(page).toHaveURL(/participantId=1/u);
  await expect(page).toHaveURL(/orderBy=createdDate/u);
  await expect(page).toHaveURL(/orderDir=desc/u);
  await expect(page).not.toHaveURL(/pageNum=/u);
  expect(
    await page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).toBe(spaMarker);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);
  await page.locator('.filters button[data-toggle="order"]').click();
  await expect(page).toHaveURL(/orderBy=createdDate/u);
  await expect(page).toHaveURL(/orderDir=asc/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(
    `${projectReviewsPath}?state=open&filter=comment&orderBy=createdDate&orderDir=asc`,
  );
  await expect(page.locator('.filters button.filter[data-field="createdDate"]')).toHaveAttribute(
    "data-value",
    "desc",
  );
  await page.locator('.filters button[data-toggle="order"]').click();
  await expect(page).toHaveURL(/orderBy=createdDate/u);
  await expect(page).toHaveURL(/orderDir=desc/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(
    `${projectReviewsPath}?state=open&filter=comment&orderBy=createdDate&orderDir=desc`,
  );
  await expect(page.locator('.filters button.filter[data-field="createdDate"]')).toHaveAttribute(
    "data-value",
    "asc",
  );
  await page.locator('.filters button[data-toggle="order"]').click();
  await expect(page).toHaveURL(/orderBy=createdDate/u);
  await expect(page).toHaveURL(/orderDir=asc/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);
  await page.locator('.nav-tabs button[data-value="closed"]').click();
  await expect(page).toHaveURL(/state=closed/u);
  await expect(page).not.toHaveURL(/pageNum=/u);

  await page.goto(`${projectReviewsPath}?state=open`);
  await page.locator('#search input[name="filter"]').fill("needle");
  await page.locator("#search").evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page).toHaveURL(/filter=needle/u);

  expect(requests.some((url) => url.searchParams.get("filter") === "comment")).toBe(true);
});

test("project review row source uses TanStack Link for internal row navigation", () => {
  const source = readFileSync("src/routes/$ownerName/$projectName/reviews.tsx", "utf8");
  const rowSource = source.slice(
    source.indexOf("function ProjectReviewRow("),
    source.indexOf("function ProjectReviewPagination("),
  );

  expect(rowSource).toContain("<Link");
  expect(rowSource).not.toContain("<a");
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

async function mockProjectReviews(page: Page) {
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
    `**/api/v1/owners/${PROJECT_OWNER_NAME}/projects/${PROJECT_NAME}/container`,
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
          organizationName: PROJECT_OWNER_NAME,
          ownerName: PROJECT_OWNER_NAME,
          projectName: PROJECT_NAME,
          vcs: "GIT",
          viewerCanUpdate: true,
          viewerUserId: 1,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${PROJECT_OWNER_NAME}/projects/${PROJECT_NAME}/reviews**`,
    async (route) => {
      requests.push(new URL(route.request().url()));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          allCount: 2,
          authorCount: 1,
          closedCount: 1,
          items: [
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
          openCount: 2,
          pageNum: 1,
          pageSize: 15,
          participantCount: 1,
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
    const searchForm = requireElement<HTMLFormElement>("#search");
    const searchInput = requireElement<HTMLInputElement>('#search input[name="filter"]');
    const stateTab = requireElement<HTMLButtonElement>('.nav-tabs button[data-value="open"]');
    const firstRow = requireElement(".review-list-wrap .post-item");
    const titleWrap = requireElement(".review-list-wrap .post-item .title-wrap");
    const list = requireElement(".review-list-wrap");
    const exportLink = requireElement('.pull-left a[href$="format=xls"]');
    const firstRowStyle = getComputedStyle(firstRow);
    const titleStyle = getComputedStyle(titleWrap);
    const stateTabStyle = getComputedStyle(stateTab);

    return {
      exportTopAfterList: exportLink.getBoundingClientRect().top > list.getBoundingClientRect().top,
      leftColumnWidth: Math.round(leftColumn.getBoundingClientRect().width),
      rowCount: document.querySelectorAll(".review-list-wrap .post-item").length,
      rowPaddingBlock:
        Math.round(parseFloat(firstRowStyle.paddingTop)) +
        Math.round(parseFloat(firstRowStyle.paddingBottom)),
      searchAction: searchForm.getAttribute("action"),
      searchInputWidth: Math.round(searchInput.getBoundingClientRect().width),
      stateTabBorderBottomColor: stateTabStyle.borderBottomColor,
      stateTabLineHeight: stateTabStyle.lineHeight,
      stateTabPadding: stateTabStyle.padding,
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
