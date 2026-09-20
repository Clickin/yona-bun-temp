import { expect, test, type Page } from "../wtr-compat.ts";

const PROJECT_OWNER_NAME = "weblabs";
const PROJECT_NAME = "portal";
const PROJECT_ROUTE = `/${PROJECT_OWNER_NAME}/${PROJECT_NAME}`;
const PROJECT_REVIEWS_ROUTE = `${PROJECT_ROUTE}/reviews`;
const PROJECT_GROUP_SEARCH_ROUTE = `/organizations/${PROJECT_OWNER_NAME}/search`;

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
  // F5 (2026-08-13): the route restored its page-wrap-outer in the 2026-08-11
  // reviews-shell closure (ownership-project-reviews-batch6 geometry); the
  // wrapper-less count-0 pin predates that route change.
  await expect(page.locator(".page-wrap-outer")).toHaveCount(1);
  await expect(page.locator(".project-page-wrap")).toHaveCount(1);
  await expect(page.locator(".review-list-wrap .error-wrap")).toBeVisible();
  await expect(page.locator("#pagination.page-navigation-wrap")).toHaveCount(1);
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  expect(await emptyReviewGeometry(page)).toEqual({
    documentWidth: 1366,
    // F5 (2026-08-13): with the restored page-wrap-outer the project-page-wrap
    // insets to x 10 / width 1346 (10px page-wrap-outer padding) at y 213
    // (page-wrap-outer margin-top 10 + project-page-wrap margin-top 5).
    height: 500,
    width: 1346,
    x: 10,
    y: 213,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/reviews`);
  expect(await emptyReviewGeometry(page)).toEqual({
    documentWidth: 390,
    height: 670,
    width: 390,
    x: 0,
    // F5 (2026-08-13): +5px — project-page-wrap margin-top 5 inside the
    // restored page-wrap-outer.
    y: 213,
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
  await expect(page.locator("[data-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${projectBasePath}/search`,
  );
  expect(await projectHeaderMetrics(page)).toEqual({
    headerClassName: "gnb-outer",
    searchAction: `${projectBasePath}/search`,
    searchBoxHasRetiredLegacyClass: true,
    searchBoxHasRetiredSelectClass: true,
    searchBoxOwner: "global-gnb-search-box",
    searchBoxContainedInHeader: true,
    searchBoxInsideSearchForm: true,
    searchFormContainedInHeader: true,
    searchScopeContainedInHeader: true,
  });
  await page.locator("#gnb-search-scope-title").click();
  const searchScopeItems = page.locator("[data-owner=global-gnb-search-scope-item] > button");
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
  const exportLink = page.locator(
    '[data-owner="project-reviews-export-action"] a.ybtn.small[href$="format=xls"]',
  );
  await expect(exportLink).toHaveText("Download as Excel file");
  // F5 dist-truth (2026-08-11): the reloadDocument Link renders the href one
  // frame after the anchor; poll the attribute instead of racing the first read.
  await expect
    .poll(async () => exportLink.evaluate((el) => el.getAttribute("href")))
    .toBe(`${projectReviewsPath}?filter=comment&format=xls`);

  await page.goto(
    `${projectReviewsPath}?state=open&filter=comment&pageNum=3&orderBy=createdDate&orderDir=asc`,
  );
  // F5 dist-truth (2026-08-11): the export action lives in the span10 search-wrap
  // (no .pull-left ancestor); the reloadDocument Link renders the href a frame late.
  await expect
    .poll(async () =>
      page
        .locator('[data-owner="project-reviews-export-action"] a.ybtn.small')
        .evaluate((el) => el.getAttribute("href")),
    )
    .toBe(`${projectReviewsPath}?orderDir=asc&filter=comment&format=xls`);
  await page.goto(`${projectReviewsPath}?state=open&filter=comment`);

  expect(await reviewListMetrics(page)).toEqual({
    activeSidebarButtonContained: true,
    contentStartsAfterSidebar: true,
    exportTopAfterList: true,
    filterRightAligned: true,
    // F5 (2026-08-13): the span2 sidebar resolves to 188px with the
    // page-wrap-outer shell (bootstrap span2 = 14.89% of the 1260 content);
    // the 191 pin predates the shell restoration.
    leftColumnWidth: 188,
    listStartsBelowTabs: true,
    paginationAfterExport: true,
    rowCount: 2,
    rowPaddingBlock: 20,
    searchAction: projectReviewsPath,
    searchBarStartsInSidebar: true,
    searchInputContainedInSearchBar: true,
    searchInputWidth: 168,
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
  await expect(page.locator(".filters")).toHaveClass(/pull-right/u);
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
  await expect(page.locator(".review-list-wrap .avatar-wrap").first()).not.toHaveClass(/active/u);
  await expect(page.locator(".review-list-wrap .avatar-wrap").first()).not.toHaveAttribute(
    "data-placement",
  );
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).toHaveAttribute(
    "title",
    "dev",
  );
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).toHaveText("Dev Member");
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).not.toHaveClass(
    /active/u,
  );
  await expect(page.locator(".review-list-wrap .infos-link-item").first()).not.toHaveAttribute(
    "data-placement",
  );
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".infos-item").nth(1),
  ).toHaveAttribute("title", "2000-07-01 10:15:00 AM");
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".infos-item").nth(1),
  ).toHaveText("2000-07-01");
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

test("review pagination preserves the legacy two-page SPA controls", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const projectReviewsPath = `${basePath}${PROJECT_REVIEWS_ROUTE}`;
  await mockProjectReviews(page, { pagination: true });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${projectReviewsPath}?filter=comment&pageNum=1`);

  const pagination = page.locator("[data-owner=site-pagination-root]");
  await expect(pagination).toBeVisible();
  await expect(pagination.locator("li")).toHaveCount(5);
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(pagination.locator("ul")).toHaveCSS("margin-left", "-120px");
  await expect(pagination.locator("i").first()).toHaveCSS("background-position", "-164px -2px");
  await expect(pagination.locator("a").filter({ hasText: "Next page" })).toHaveAttribute(
    "href",
    `${projectReviewsPath}?filter=comment&pageNum=2`,
  );

  const pageNumInput = pagination.locator('input[name="pageNum"]');
  await pageNumInput.fill("1.5");
  await pageNumInput.press("Enter");
  await expect(pageNumInput).toHaveValue("1");
  await expect(page).toHaveURL(`${projectReviewsPath}?filter=comment&pageNum=1`);

  const marker = "review-pagination-spa";
  await page.evaluate((value) => {
    (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker = value;
  }, marker);
  await pagination.locator("a").filter({ hasText: "Next page" }).click();
  await expect(page).toHaveURL(`${projectReviewsPath}?filter=comment&pageNum=2`);
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");
  await expect(
    page.evaluate(
      () => (window as Window & { __projectReviewsSpaMarker?: string }).__projectReviewsSpaMarker,
    ),
  ).resolves.toBe(marker);

  await page.setViewportSize({ width: 390, height: 844 });
  // F5 dist-truth (2026-08-11): the carousel keeps the inline margin-left at
  // mobile (legacy _responsive.less @media(1199px) .page-nums reset loses to
  // the React-owned inline style), so the pinned value is the desktop -120px.
  await expect(pagination.locator("ul")).toHaveCSS("margin-left", "-120px");
  await expect(pagination.locator("i").last()).toHaveCSS("background-position", "-23px -13px");
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
  ).toHaveAttribute("title", "2000-07-01 10:15:00 AM");
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".infos-item").nth(1),
  ).toHaveText("2000-07-01");
  await expect(page.locator(".review-list-wrap [data-placement]")).toHaveCount(0);
  await expect(
    page.locator(".review-list-wrap .post-item").first().locator(".title"),
  ).toHaveAttribute("href", `${projectBasePath}/pullRequest/3/changes#thread-31`);
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
  options: {
    empty?: boolean;
    ownerName?: string;
    pagination?: boolean;
    projectName?: string;
    vcs?: string;
  } = {},
) {
  const ownerName = options.ownerName ?? PROJECT_OWNER_NAME;
  const projectName = options.projectName ?? PROJECT_NAME;
  const firstCreatedLabel = new Date(2000, 6, 1, 10, 15).toISOString();
  const secondCreatedLabel = new Date(2000, 6, 2, 10, 15).toISOString();
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
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container**`,
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
      const requestUrl = new URL(route.request().url());
      requests.push(requestUrl);
      const pageNum = options.pagination
        ? Math.min(Math.max(Number(requestUrl.searchParams.get("pageNum")) || 1, 1), 2)
        : 1;
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
                      createdLabel: firstCreatedLabel,
                      id: 1001,
                      threadId: 31,
                    },
                    {
                      authorAvatarUrl: "/assets/images/default-avatar-32.png",
                      authorId: 1,
                      authorLabel: "Site Admin",
                      authorLoginId: "admin",
                      contentsMarkdown: "Follow-up",
                      createdLabel: firstCreatedLabel,
                      id: 1002,
                      threadId: 31,
                    },
                  ],
                  commitId: "",
                  createdLabel: firstCreatedLabel,
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
                      createdLabel: secondCreatedLabel,
                      id: 2001,
                      threadId: 32,
                    },
                    {
                      authorAvatarUrl: "/assets/images/default-avatar-32.png",
                      authorId: 1,
                      authorLabel: "Site Admin",
                      authorLoginId: "admin",
                      contentsMarkdown: "Ack",
                      createdLabel: secondCreatedLabel,
                      id: 2002,
                      threadId: 32,
                    },
                  ],
                  commitId: "fedcba987654",
                  createdLabel: secondCreatedLabel,
                  id: 32,
                  path: "src/commit-specific-thread.rs",
                  pullRequestNumber: 4,
                  startLine: 9,
                  startSide: "B",
                  state: "open",
                },
              ],
          openCount: options.empty ? 0 : 2,
          pageNum,
          pageSize: options.pagination ? 1 : 15,
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
    const header = requireElement("[data-owner=global-gnb-outer]");
    const searchForm = requireElement<HTMLFormElement>('form[name="gnb-search-form"]');
    const searchScope = requireElement<HTMLButtonElement>("#gnb-search-scope-title");
    const searchBox = requireElement('[data-owner="global-gnb-search-box"]');
    const headerRect = header.getBoundingClientRect();
    const searchFormRect = searchForm.getBoundingClientRect();
    const searchScopeRect = searchScope.getBoundingClientRect();
    const searchBoxRect = searchBox.getBoundingClientRect();

    return {
      headerClassName: header.className,
      searchAction: searchForm.getAttribute("action"),
      searchBoxHasRetiredLegacyClass: searchBox.classList.contains("search-box"),
      searchBoxHasRetiredSelectClass: searchBox.classList.contains("select"),
      searchBoxOwner: searchBox.getAttribute("data-owner"),
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
    const exportLink = requireElement('[data-owner="project-reviews-export-action"] a.ybtn.small');
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
