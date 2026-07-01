import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1100, height: 720 } });

const EXPECTED_USER_ISSUES_PAGE_WRAP = `
<div class="page-wrap-outer">
  <div class="page-wrap">
    <ul class="nav nav-tabs">
      <li><a href="__BASE_PATH__/notifications">Notification</a></li>
      <li class="active"><a href="__BASE_PATH__/user/issues">My Issues</a></li>
      <li><a href="__BASE_PATH__/user/files">My Files</a></li>
      <li><button type="button" class="ybtn hide-in-mobile" id="setDefaultLoginPage" data-url="user/issues" title="Set to default page" data-trigger="hover" data-placement="bottom" data-toggle="popover" data-content="Make current page the index page when logged in">Set to default page</button></li>
    </ul>
    <div pjax-container="" class="row-fluid issue-list-wrap">
      <div class="left-menu span2 span-hard-wrap">
        <div class="inner advanced">
          <ul class="lst-stacked unstyled">
            <li class="active"><a pjax-filter="" href="#" data-author-id="" data-assignee-id="1" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="assigned-to-me"><i class="yobicon-user"></i>Assigned</span></a></li>
            <li class=""><a pjax-filter="" href="#" data-author-id="1" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="authored-by-me"><i class="yobicon-pencil"></i>Created</span></a></li>
            <li class=""><a pjax-filter="" href="#" data-author-id="" data-assignee-id="" data-commenter-id="1" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="commented-by-me"><i class="yobicon-comments"></i>Commented</span></a></li>
            <li class=""><a pjax-filter="" href="#" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="1" data-sharer-id="" data-favorite-id=""><span class="mentioned-of-me"><i class="yobicon-at"></i>Mentioned</span>(2)</a></li>
            <li class=""><a pjax-filter="" href="#" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="1" data-favorite-id=""><span class="shared-with-me"><i class="yobicon-share"></i>Shared</span>(1)</a></li>
            <li class=""><a pjax-filter="" href="#" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id="1"><span class="favorite-issue"><i class="yobicon-favorite"></i>Favorite</span>(1)</a></li>
          </ul>
          <form id="search" name="search" action="__BASE_PATH__/user/issues" method="get">
            <input type="hidden" name="orderBy" value="updatedDate"><input type="hidden" name="orderDir" value="desc"><input type="hidden" name="state" value="open">
            <input type="hidden" name="authorId" value="" data-search="authorId"><input type="hidden" name="commenterId" value="" data-search="commenterId"><input type="hidden" name="assigneeId" value="1" data-search="assigneeId"><input type="hidden" name="mentionId" value="" data-search="mentionId"><input type="hidden" name="sharerId" value="" data-search="sharerId"><input type="hidden" name="favoriteId" value="" data-search="favoriteId">
            <div class="search myissues-search-input"><div class="search-bar"><input name="filter" class="textbox full" type="text" placeholder="Search Issues" value=""><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></div>
          </form>
        </div>
      </div>
      <div class="span10 span-hard-wrap" id="span10">
        <ul class="nav nav-tabs nm">
          <li class="active"><a href="#" state="open">Open<span class="num-badge">2</span></a></li><li class=""><a href="#" state="closed">Closed<span class="num-badge">1</span></a></li>
          <li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" data-content="Splits list and body into columns respectively"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li>
          <li class="show-subtasks-li"><div class="show-subtasks mr10" id="two-column-mode-checkbox" data-toggle="popover" data-trigger="hover" data-placement="top" title="Show subtask" data-content="Show subtask always"><label class="checkbox"><div class="show-subtasks-button-border"><input id="toggle-show-subtasks" type="checkbox"><span class="show-subtasks-text">Show subtask</span></div></label></div></li>
        </ul>
        <div class="filter-wrap small-heights"><div class="filters pull-right"><a href="#" orderBy="dueDate" orderDir="desc" class="filter"><i class="ico btn-gray-arrow down"></i>Due Date</a><a href="#" orderBy="updatedDate" orderDir="asc" class="filter active"><i class="ico btn-gray-arrow down"></i>Updated</a><a href="#" orderBy="createdDate" orderDir="desc" class="filter"><i class="ico btn-gray-arrow down"></i>Created</a><a href="#" orderBy="numOfComments" orderDir="desc" class="filter"><i class="ico btn-gray-arrow down"></i>Comments</a></div></div>
        <ul class="post-list-wrap my-issues">
          <li class="post-item title" id="issue-item-42" href="__BASE_PATH__/admin/sample/issue/11">
            <div class="span12 span-hard-wrap">
              <div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/admin/sample" class="title project" data-toggle="tooltip" data-placement="bottom" title="Project name">sample</a><span class="infos-item post-id">#11</span></div>
              <div class="title-wrap span6"><span class="title-cell"><a href="__BASE_PATH__/admin/sample/issue/11" class="title">Assigned issue</a><span class="infos-item item-count-groups"><a href="__BASE_PATH__/admin/sample/issue/11#comments" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">3</span></a><a href="__BASE_PATH__/admin/sample/issue/11#vote" class="vote-count"><span class="count-groups item-icon"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a></span><span class="for-subtask-progressbar"></span><a href="__BASE_PATH__/admin/sample/issues?state=open&amp;labelIds=8" class="label issue-label list-label twoColumeModeTarget" data-label-id="8">bug</a><div class="child-issue-list hide"></div></span></div>
              <div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/alice" class="infos-link-item author-cell" data-toggle="tooltip" data-placement="top" title="alice">Alice</a></div>
              <div class="infos span3 meta"><span class="infos-item" title="2026-06-30">2026-06-30</span><span class="infos-item mileston-tag"><a href="__BASE_PATH__/admin/sample/milestone/5" data-toggle="tooltip" data-placement="top" title="Milestone">v1.0</a></span><span class="infos-item due-date" data-toggle="tooltip" data-placement="top" title="2026-07-05"><i class="yobicon-clock2"></i>5 days left</span></div>
            </div>
          </li>
          <li class="post-item title" id="issue-item-43" href="__BASE_PATH__/admin/sample/issue/12"><div class="span12 span-hard-wrap"><div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/admin/sample" class="title project" data-toggle="tooltip" data-placement="bottom" title="Project name">sample</a><span class="infos-item post-id">#12</span></div><div class="title-wrap span6"><span class="title-cell"><a href="__BASE_PATH__/admin/sample/issue/12" class="title">Second issue</a><span class="for-subtask-progressbar"></span><div class="child-issue-list hide"></div></span></div><div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/bob" class="infos-link-item author-cell" data-toggle="tooltip" data-placement="top" title="bob">Bob</a></div><div class="infos span3 meta"><span class="infos-item" title="2026-06-29">2026-06-29</span></div></div></li>
        </ul>
        <div id="pagination" data-total="1"></div>
      </div>
    </div>
  </div>
</div>
`;

const EXPECTED_FILTERED_EMPTY_USER_ISSUES_PAGE_WRAP = `
<div class="page-wrap-outer">
  <div class="page-wrap">
    <ul class="nav nav-tabs">
      <li><a href="__BASE_PATH__/notifications">Notification</a></li>
      <li class="active"><a href="__BASE_PATH__/user/issues">My Issues</a></li>
      <li><a href="__BASE_PATH__/user/files">My Files</a></li>
      <li><button type="button" class="ybtn hide-in-mobile" id="setDefaultLoginPage" data-url="user/issues" title="Set to default page" data-trigger="hover" data-placement="bottom" data-toggle="popover" data-content="Make current page the index page when logged in">Set to default page</button></li>
    </ul>
    <div pjax-container="" class="row-fluid issue-list-wrap">
      <div class="left-menu span2 span-hard-wrap">
        <div class="inner advanced">
          <ul class="lst-stacked unstyled">
            <li class=""><a pjax-filter="" href="#" data-author-id="" data-assignee-id="1" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="assigned-to-me"><i class="yobicon-user"></i>Assigned</span></a></li>
            <li class=""><a pjax-filter="" href="#" data-author-id="1" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="authored-by-me"><i class="yobicon-pencil"></i>Created</span></a></li>
            <li class=""><a pjax-filter="" href="#" data-author-id="" data-assignee-id="" data-commenter-id="1" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="commented-by-me"><i class="yobicon-comments"></i>Commented</span></a></li>
            <li class=""><a pjax-filter="" href="#" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="1" data-sharer-id="" data-favorite-id=""><span class="mentioned-of-me"><i class="yobicon-at"></i>Mentioned</span></a></li>
            <li class=""><a pjax-filter="" href="#" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="1" data-favorite-id=""><span class="shared-with-me"><i class="yobicon-share"></i>Shared</span></a></li>
            <li class="active"><a pjax-filter="" href="#" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id="1"><span class="favorite-issue"><i class="yobicon-favorite"></i>Favorite</span></a></li>
          </ul>
          <form id="search" name="search" action="__BASE_PATH__/user/issues" method="get">
            <input type="hidden" name="orderBy" value="createdDate"><input type="hidden" name="orderDir" value="asc"><input type="hidden" name="state" value="closed">
            <input type="hidden" name="authorId" value="" data-search="authorId"><input type="hidden" name="commenterId" value="" data-search="commenterId"><input type="hidden" name="assigneeId" value="" data-search="assigneeId"><input type="hidden" name="mentionId" value="" data-search="mentionId"><input type="hidden" name="sharerId" value="" data-search="sharerId"><input type="hidden" name="favoriteId" value="1" data-search="favoriteId">
            <div class="search myissues-search-input"><div class="search-bar"><input name="filter" class="textbox full" type="text" placeholder="Search Issues" value="needle"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></div>
          </form>
        </div>
      </div>
      <div class="span10 span-hard-wrap" id="span10">
        <ul class="nav nav-tabs nm">
          <li class=""><a href="#" state="open">Open<span class="num-badge">0</span></a></li><li class="active"><a href="#" state="closed">Closed<span class="num-badge">0</span></a></li>
          <li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" data-content="Splits list and body into columns respectively"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li>
          <li class="show-subtasks-li"><div class="show-subtasks mr10" id="two-column-mode-checkbox" data-toggle="popover" data-trigger="hover" data-placement="top" title="Show subtask" data-content="Show subtask always"><label class="checkbox"><div class="show-subtasks-button-border"><input id="toggle-show-subtasks" type="checkbox"><span class="show-subtasks-text">Show subtask</span></div></label></div></li>
        </ul>
        <div class="error-wrap"><i class="ico ico-err1"></i><p>No issue found</p></div>
      </div>
    </div>
  </div>
</div>
`;

test("current-user issues page matches legacy issue/my_list.scala.html shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
  await page.route(
    "**/api/v1/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=1&state=open",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          closedIssueCount: 1,
          filter: "assigned",
          items: [
            {
              assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
              assigneeLabel: "Admin",
              assigneeLoginId: "admin",
              authorLabel: "Alice",
              authorLoginId: "alice",
              commentCount: 3,
              createdLabel: "2026-06-30",
              dueDateLabel: "2026-07-05",
              dueDateText: "5 days left",
              id: 42,
              issueNumber: 11,
              labels: [{ color: "#51aacc", id: 8, name: "bug" }],
              milestoneId: 5,
              milestoneTitle: "v1.0",
              ownerName: "admin",
              projectName: "sample",
              state: "open",
              title: "Assigned issue",
              voterCount: 1,
            },
            {
              assigneeLoginId: "admin",
              authorLabel: "Bob",
              authorLoginId: "bob",
              commentCount: 0,
              createdLabel: "2026-06-29",
              id: 43,
              issueNumber: 12,
              labels: [],
              ownerName: "admin",
              projectName: "sample",
              state: "open",
              title: "Second issue",
              voterCount: 0,
            },
          ],
          openIssueCount: 2,
          pageNum: 1,
          pageSize: 20,
          sideFilterCounts: { favorite: 1, mentioned: 2, shared: 1 },
          state: "open",
          totalCount: 2,
          totalPages: 1,
          viewerUserId: 1,
        }),
      });
    },
  );

  await page.goto(`${basePath}/user/issues`);
  await expect(page.locator(".post-list-wrap.my-issues .post-item")).toHaveCount(2);

  const actual = await canonicalizePageWrap(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_USER_ISSUES_PAGE_WRAP.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);

  expect(await readUserIssuesMetrics(page)).toEqual({
    issueListDisplay: "block",
    leftMenuWidth: 161,
    pageWrapMarginTop: "10px",
    rowFluidWidth: 1080,
    span10Width: 896,
  });

  await page.route(
    "**/api/v1/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=1&query=needle&state=open",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          closedIssueCount: 0,
          filter: "assigned",
          items: [],
          openIssueCount: 0,
          pageNum: 1,
          pageSize: 20,
          sideFilterCounts: { favorite: 0, mentioned: 0, shared: 0 },
          state: "open",
          totalCount: 0,
          totalPages: 1,
          viewerUserId: 1,
        }),
      });
    },
  );
  await page.fill('form#search input[name="filter"]', "needle");
  const searchResponse = page.waitForResponse((response) =>
    response
      .url()
      .endsWith(
        "/api/v1/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=1&query=needle&state=open",
      ),
  );
  await page.click("form#search button[type=submit]");
  await searchResponse;
  await expect(page).toHaveURL(/query=needle/);
});

test("current-user issues page matches legacy filtered empty search state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
  await page.route(
    "**/api/v1/user/issues?filter=favorite&orderBy=createdDate&orderDir=asc&pageNum=2&query=needle&state=closed",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          closedIssueCount: 0,
          filter: "favorite",
          items: [],
          openIssueCount: 0,
          pageNum: 2,
          pageSize: 20,
          sideFilterCounts: { favorite: 1, mentioned: 2, shared: 1 },
          state: "closed",
          totalCount: 0,
          totalPages: 1,
          viewerUserId: 1,
        }),
      });
    },
  );

  await page.goto(
    `${basePath}/user/issues?filter=favorite&query=needle&pageNum=2&state=closed&orderBy=createdDate&orderDir=asc`,
  );
  await expect(page.locator(".error-wrap")).toBeVisible();

  const actual = await canonicalizePageWrap(page);
  const expected = await canonicalizeHtml(
    page,
    EXPECTED_FILTERED_EMPTY_USER_ISSUES_PAGE_WRAP.replaceAll("__BASE_PATH__", basePath),
  );
  expect(actual).toEqual(expected);
});

test("current-user issues state tab preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForStateTabs(page);

  await page.goto(`${basePath}/user/issues`);
  const closedTab = page.locator('#span10 .nav.nav-tabs a[state="closed"]');
  await expect(closedTab).toHaveAttribute("href", "#");
  await expect(closedTab).toHaveAttribute("state", "closed");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await closedTab.click();

  await expect(page).toHaveURL(
    `${basePath}/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&state=closed`,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator('input[name="state"]')).toHaveValue("closed");
  await expect(page.locator('#span10 .nav.nav-tabs li.active a[state="closed"]')).toHaveText(
    "Closed1",
  );
});

test("current-user issues sort filter preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);
  const dueDateFilter = page.locator(".filter-wrap .filter").filter({ hasText: "Due Date" });
  await expect(dueDateFilter).toHaveAttribute("href", "#");
  await expect(dueDateFilter).toHaveAttribute("orderBy", "dueDate");
  await expect(dueDateFilter).toHaveAttribute("orderDir", "desc");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await dueDateFilter.click();

  await expect(page).toHaveURL(
    `${basePath}/user/issues?filter=assigned&orderBy=dueDate&orderDir=desc&state=open`,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator('.filter-wrap .filter.active[orderBy="dueDate"]')).toHaveText(
    "Due Date",
  );
});

test("current-user issues quick filter preserves legacy pjax hooks with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForQuickFilters(page);

  await page.goto(`${basePath}/user/issues`);
  const favoriteFilter = page.locator(".left-menu .lst-stacked a").filter({ hasText: "Favorite" });
  await expect(favoriteFilter).toHaveAttribute("href", "#");
  await expect(favoriteFilter).toHaveAttribute("pjax-filter", "");
  await expect(favoriteFilter).toHaveAttribute("data-favorite-id", "1");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await favoriteFilter.click();

  await expect(page).toHaveURL(
    `${basePath}/user/issues?filter=favorite&orderBy=updatedDate&orderDir=desc&state=open`,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".left-menu .lst-stacked li.active a")).toHaveText("Favorite(1)");
  await expect(page.locator('input[name="favoriteId"]')).toHaveValue("1");
});

async function mockUserIssuesForStateTabs(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
  await page.route("**/api/v1/user/issues?**", async (route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get("state") === "closed" ? "closed" : "open";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 1,
        filter: "assigned",
        items: [],
        openIssueCount: 2,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: { favorite: 1, mentioned: 2, shared: 1 },
        state,
        totalCount: 0,
        totalPages: 1,
        viewerUserId: 1,
      }),
    });
  });
}

async function mockUserIssuesForQuickFilters(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
  await page.route("**/api/v1/user/issues?**", async (route) => {
    const url = new URL(route.request().url());
    const filter = url.searchParams.get("filter") === "favorite" ? "favorite" : "assigned";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 1,
        filter,
        items: [],
        openIssueCount: 2,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: { favorite: 1, mentioned: 2, shared: 1 },
        state: "open",
        totalCount: 0,
        totalPages: 1,
        viewerUserId: 1,
      }),
    });
  });
}

async function mockUserIssuesForFilterLinks(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      }),
    });
  });
  await page.route("**/api/v1/user/issues?**", async (route) => {
    const url = new URL(route.request().url());
    const orderBy = url.searchParams.get("orderBy") ?? "updatedDate";
    const orderDir = url.searchParams.get("orderDir") ?? "desc";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 1,
        filter: "assigned",
        items: [
          {
            assigneeLoginId: "admin",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 0,
            createdLabel: "2026-06-30",
            id: 42,
            issueNumber: 11,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: `First ${orderBy} ${orderDir}`,
            voterCount: 0,
          },
          {
            assigneeLoginId: "admin",
            authorLabel: "Bob",
            authorLoginId: "bob",
            commentCount: 0,
            createdLabel: "2026-06-29",
            id: 43,
            issueNumber: 12,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "Second issue",
            voterCount: 0,
          },
        ],
        openIssueCount: 2,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: { favorite: 1, mentioned: 2, shared: 1 },
        state: "open",
        totalCount: 2,
        totalPages: 1,
        viewerUserId: 1,
      }),
    });
  });
}

async function readUserIssuesMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const rowFluid = document.querySelector<HTMLElement>(".row-fluid.issue-list-wrap");
    const leftMenu = document.querySelector<HTMLElement>(".left-menu");
    const span10 = document.querySelector<HTMLElement>("#span10");
    const issueList = document.querySelector<HTMLElement>(".post-list-wrap.my-issues");
    if (!pageWrapOuter || !rowFluid || !leftMenu || !span10 || !issueList) {
      throw new Error("Expected user issues metric targets are missing.");
    }
    return {
      issueListDisplay: getComputedStyle(issueList).display,
      leftMenuWidth: Math.round(leftMenu.getBoundingClientRect().width),
      pageWrapMarginTop: getComputedStyle(pageWrapOuter).marginTop,
      rowFluidWidth: Math.round(rowFluid.getBoundingClientRect().width),
      span10Width: Math.round(span10.getBoundingClientRect().width),
    };
  });
}

async function canonicalizePageWrap(page: Page) {
  return page.evaluate(() => {
    function visit(current: Element): string {
      const stableAttributes = [
        "pjax-container",
        "pjax-filter",
        "id",
        "class",
        "name",
        "type",
        "method",
        "action",
        "value",
        "placeholder",
        "href",
        "title",
        "state",
        "orderBy",
        "orderDir",
        "data-author-id",
        "data-assignee-id",
        "data-commenter-id",
        "data-milestone-id",
        "data-mention-id",
        "data-sharer-id",
        "data-favorite-id",
        "data-search",
        "data-total",
        "data-url",
        "data-trigger",
        "data-toggle",
        "data-placement",
        "data-content",
        "data-label-id",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
        .join(" ");
      const open = attrs
        ? `<${current.tagName.toLowerCase()} ${attrs}>`
        : `<${current.tagName.toLowerCase()}>`;
      const children = Array.from(current.childNodes)
        .map((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            return (child.textContent ?? "").replace(/\s+/g, " ").trim();
          }
          if (child.nodeType === Node.ELEMENT_NODE) {
            return visit(child as Element);
          }
          return "";
        })
        .filter(Boolean)
        .join("");
      return `${open}${children}</${current.tagName.toLowerCase()}>`;
    }

    const root = document.querySelector(".page-wrap-outer");
    if (!root) {
      throw new Error("Expected page wrap root is missing.");
    }
    return visit(root);
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate(
    ({ markup }) => {
      function visit(current: Element): string {
        const stableAttributes = [
          "pjax-container",
          "pjax-filter",
          "id",
          "class",
          "name",
          "type",
          "method",
          "action",
          "value",
          "placeholder",
          "href",
          "title",
          "state",
          "orderBy",
          "orderDir",
          "data-author-id",
          "data-assignee-id",
          "data-commenter-id",
          "data-milestone-id",
          "data-mention-id",
          "data-sharer-id",
          "data-favorite-id",
          "data-search",
          "data-total",
          "data-url",
          "data-trigger",
          "data-toggle",
          "data-placement",
          "data-content",
          "data-label-id",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`)
          .join(" ");
        const open = attrs
          ? `<${current.tagName.toLowerCase()} ${attrs}>`
          : `<${current.tagName.toLowerCase()}>`;
        const children = Array.from(current.childNodes)
          .map((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              return (child.textContent ?? "").replace(/\s+/g, " ").trim();
            }
            if (child.nodeType === Node.ELEMENT_NODE) {
              return visit(child as Element);
            }
            return "";
          })
          .filter(Boolean)
          .join("");
        return `${open}${children}</${current.tagName.toLowerCase()}>`;
      }

      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return Array.from(template.content.children)
        .map((root) => visit(root))
        .join("");
    },
    { markup: html },
  );
}
