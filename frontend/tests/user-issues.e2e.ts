import { readFileSync } from "node:fs";
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
            <li class="active"><button pjax-filter="" type="button" data-author-id="" data-assignee-id="1" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="assigned-to-me"><i class="yobicon-user"></i>Assigned</span></button></li>
            <li class=""><button pjax-filter="" type="button" data-author-id="1" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="authored-by-me"><i class="yobicon-pencil"></i>Created</span></button></li>
            <li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="" data-commenter-id="1" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="commented-by-me"><i class="yobicon-comments"></i>Commented</span></button></li>
            <li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="1" data-sharer-id="" data-favorite-id=""><span class="mentioned-of-me"><i class="yobicon-at"></i>Mentioned</span>(2)</button></li>
            <li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="1" data-favorite-id=""><span class="shared-with-me"><i class="yobicon-share"></i>Shared</span>(1)</button></li>
            <li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id="1"><span class="favorite-issue"><i class="yobicon-favorite"></i>Favorite</span>(1)</button></li>
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
          <li class="active" data-pjax=""><button type="button" state="open">Open<span class="num-badge">2</span></button></li><li class="" data-pjax=""><button type="button" state="closed">Closed<span class="num-badge">1</span></button></li>
          <li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" data-content="Splits list and body into columns respectively"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li>
          <li class="show-subtasks-li"><div class="show-subtasks mr10" id="two-column-mode-checkbox" data-toggle="popover" data-trigger="hover" data-placement="top" title="Show subtask" data-content="Show subtask always"><label class="checkbox"><div class="show-subtasks-button-border"><input id="toggle-show-subtasks" type="checkbox"><span class="show-subtasks-text">Show subtask</span></div></label></div></li>
        </ul>
        <div class="filter-wrap small-heights"><div class="filters pull-right"><button class="filter" type="button" orderBy="dueDate" orderDir="desc"><i class="ico btn-gray-arrow down"></i>Due Date</button><button class="filter active" type="button" orderBy="updatedDate" orderDir="asc"><i class="ico btn-gray-arrow down"></i>Updated</button><button class="filter" type="button" orderBy="createdDate" orderDir="desc"><i class="ico btn-gray-arrow down"></i>Created</button><button class="filter" type="button" orderBy="numOfComments" orderDir="desc"><i class="ico btn-gray-arrow down"></i>Comments</button></div></div>
        <ul class="post-list-wrap my-issues">
          <li class="post-item title" id="issue-item-42" href="__BASE_PATH__/admin/sample/issue/11">
            <div class="span12 span-hard-wrap">
              <div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item project-name"><a href="__BASE_PATH__/admin/sample" class="title project" data-toggle="tooltip" data-placement="bottom" title="Project name">sample</a></span><span class="infos-item post-id">#11</span></div>
              <div class="title-wrap span6"><span class="title-cell"><a href="__BASE_PATH__/admin/sample/issue/11" class="title">Assigned issue</a><span class="item-count-groups"><a href="__BASE_PATH__/admin/sample/issue/11#comments" class="comments-count"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">3</span></a><a href="__BASE_PATH__/admin/sample/issue/11#vote" class="vote-count"><span class="count-groups item-icon"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a></span><span class="for-subtask-progressbar"></span><a href="__BASE_PATH__/admin/sample/issues?state=open&amp;labelIds=8" class="label issue-label list-label twoColumeModeTarget white" data-label-id="8">bug</a><div class="child-issue-list hide"></div></span></div>
              <div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/alice" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="alice">Alice</a></div>
              <div class="infos span3 meta"><span class="meta-cell"><span class="hide show-in-mobile"><a href="__BASE_PATH__/alice" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="alice">Alice</a></span><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="Created at 2026-06-30">2026-06-30</span><span class="mileston-tag"><a href="__BASE_PATH__/admin/sample/milestone/5" data-toggle="tooltip" data-placement="bottom" title="Milestone">v1.0</a></span><span class="pull-right" data-toggle="tooltip" data-placement="top" title="Due date: 2026-07-05"><i class="yobicon-clock2"></i>5 days left</span></span></div>
            </div>
          </li>
          <li class="post-item title" id="issue-item-43" href="__BASE_PATH__/admin/sample/issue/12"><div class="span12 span-hard-wrap"><div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item project-name"><a href="__BASE_PATH__/admin/sample" class="title project" data-toggle="tooltip" data-placement="bottom" title="Project name">sample</a></span><span class="infos-item post-id">#12</span></div><div class="title-wrap span6"><span class="title-cell"><a href="__BASE_PATH__/admin/sample/issue/12" class="title">Second issue</a><span class="for-subtask-progressbar"></span><div class="child-issue-list hide"></div></span></div><div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/bob" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="bob">Bob</a></div><div class="infos span3 meta"><span class="meta-cell"><span class="hide show-in-mobile"><a href="__BASE_PATH__/bob" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="bob">Bob</a></span><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="Created at 2026-06-29">2026-06-29</span></span></div></div></li>
        </ul>
        <div id="pagination" class="page-navigation-wrap" data-total="1"><ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li><li class="page-num"><input type="number" pattern="[0-9]*" class="input-mini nospinner" name="pageNum" max="1" min="1" value="1"></li><li class="page-num delimiter">/</li><li class="page-num">1</li><li class="page-num ikon"><span class="off">Next page</span><i class="ico btn-pg-next off"></i></li></ul></div>
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
            <li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="1" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="assigned-to-me"><i class="yobicon-user"></i>Assigned</span></button></li>
            <li class=""><button pjax-filter="" type="button" data-author-id="1" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="authored-by-me"><i class="yobicon-pencil"></i>Created</span></button></li>
            <li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="" data-commenter-id="1" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id=""><span class="commented-by-me"><i class="yobicon-comments"></i>Commented</span></button></li>
            <li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="1" data-sharer-id="" data-favorite-id=""><span class="mentioned-of-me"><i class="yobicon-at"></i>Mentioned</span></button></li>
            <li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="1" data-favorite-id=""><span class="shared-with-me"><i class="yobicon-share"></i>Shared</span></button></li>
            <li class="active"><button pjax-filter="" type="button" data-author-id="" data-assignee-id="" data-commenter-id="" data-milestone-id="" data-mention-id="" data-sharer-id="" data-favorite-id="1"><span class="favorite-issue"><i class="yobicon-favorite"></i>Favorite</span></button></li>
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
          <li class="" data-pjax=""><button type="button" state="open">Open<span class="num-badge">0</span></button></li><li class="active" data-pjax=""><button type="button" state="closed">Closed<span class="num-badge">0</span></button></li>
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
  const topTabAnchors = page.locator(".page-wrap > .nav-tabs a");
  await expect(topTabAnchors).toHaveText(["Notification", "My Issues", "My Files"]);
  await expect(topTabAnchors.nth(0)).toHaveAttribute("href", `${basePath}/notifications`);
  await expect(topTabAnchors.nth(1)).toHaveAttribute("href", `${basePath}/user/issues`);
  await expect(topTabAnchors.nth(2)).toHaveAttribute("href", `${basePath}/user/files`);
  await expect(page.locator(".page-wrap > .nav-tabs > li.active")).toHaveText("My Issues");
  expect(
    await topTabAnchors.evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        ariaCurrent: anchor.getAttribute("aria-current"),
        className: anchor.getAttribute("class"),
        dataStatus: anchor.getAttribute("data-status"),
      })),
    ),
  ).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
  ]);
  const commentVotePair = page.locator("#issue-item-42 .title-cell > .item-count-groups");
  await expect(commentVotePair).toHaveClass("item-count-groups");
  await expect(commentVotePair).not.toHaveClass(/(^|\s)infos-item(\s|$)/);
  await expect(commentVotePair.locator(".comments-count")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/11#comments`,
  );
  await expect(commentVotePair.locator(".vote-count")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/11#vote`,
  );

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
  await page.route("**/api/v1/workspace/files?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        files: [],
        filter: "",
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 1,
      }),
    });
  });
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
  await expect(page).toHaveURL(
    `${basePath}/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&query=needle&state=open`,
  );

  const myFilesTab = page.locator('.page-wrap > .nav-tabs a:has-text("My Files")');
  await expect(myFilesTab).toHaveAttribute("href", `${basePath}/user/files`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "my-files-tab";
  });
  await myFilesTab.click();
  await expect(page).toHaveURL(`${basePath}/user/files?filter=&pageNum=1`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("my-files-tab");
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

test("current-user issues route uses direct TanStack Link targets without generic adapter", () => {
  const routeSource = readFileSync(
    new URL("../src/routes/user/issues.tsx", import.meta.url),
    "utf8",
  );
  const tabsSource = routeSource.slice(
    routeSource.indexOf("function MySeriesMenuTabs("),
    routeSource.indexOf("function YobiToast("),
  );

  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("AnchorHTMLAttributes");
  expect(routeSource).not.toContain("ComponentType");
  expect(routeSource).not.toContain("as unknown as");
  expect(routeSource).not.toContain('declare module "react"');
  expect(routeSource).not.toContain("interface LiHTMLAttributes");
  expect(routeSource).not.toContain("as unknown as LiHTMLAttributes");
  expect(routeSource).not.toContain("const pjaxContainer");
  expect(routeSource).not.toContain("const pjaxFilter");
  expect(routeSource).not.toContain("const legacyState =");
  expect(routeSource).not.toContain("to={`${issuePath}#comments`}");
  expect(routeSource).not.toContain("to={`${issuePath}#vote`}");
  expect(routeSource).toContain('to={issuePath} hash="comments"');
  expect(routeSource).toContain('to={issuePath} hash="vote"');
  expect(routeSource).toContain(
    "type LegacyIssueRowAttrs = HTMLAttributes<HTMLLIElement> & { href: string };",
  );
  expect(routeSource).toContain("const legacyPjaxContainerAttrs");
  expect(routeSource).toContain("const legacyPjaxFilterAttrs");
  expect(routeSource).toContain("const legacyStateButtonAttrs");
  expect(routeSource).toContain("satisfies LegacyPjaxContainerAttrs");
  expect(routeSource).toContain("satisfies LegacyPjaxFilterAttrs");
  expect(routeSource).toContain("satisfies LegacyStateButtonAttrs");
  expect(routeSource).toContain("satisfies LegacyOrderButtonAttrs");
  expect(routeSource).toContain("orderby: filter.field");
  expect(routeSource).toContain("orderdir: nextOrderDir");
  expect(routeSource).not.toContain("orderBy: filter.field");
  expect(routeSource).not.toContain("orderDir: nextOrderDir");
  expect(routeSource).not.toContain("legacyHref");
  expect(routeSource).not.toContain("LegacyHrefListItemAttrs");
  const rowSource = routeSource.slice(
    routeSource.indexOf("function UserIssueItem("),
    routeSource.indexOf("function UserIssueLabel("),
  );
  expect(rowSource).toContain("const legacyIssueRowAttrs");
  expect(rowSource).toContain("href: issueHref");
  expect(rowSource).toContain("satisfies LegacyIssueRowAttrs");
  expect(rowSource).toContain("<li\n      {...legacyIssueRowAttrs}");
  expect(rowSource).not.toContain("href={issueHref}");
  expect(tabsSource).toContain('to="/notifications"');
  expect(tabsSource).toContain('to="/user/issues"');
  expect(tabsSource).toContain('to="/user/files"');
});

test("current-user issues state tab uses button side-effect control with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForStateTabs(page);

  await page.goto(`${basePath}/user/issues`);
  await expect(page.locator('#span10 .nav.nav-tabs a[href="#"]')).toHaveCount(0);
  const closedTab = page.locator('#span10 .nav.nav-tabs button[state="closed"]');
  await expect(closedTab).toHaveAttribute("type", "button");
  await expect(closedTab).toHaveAttribute("state", "closed");
  await expect(closedTab.locator("..")).toHaveAttribute("data-pjax", "");

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
  await expect(page.locator('#span10 .nav.nav-tabs li.active button[state="closed"]')).toHaveText(
    "Closed1",
  );
  await expect(page.locator('input[name="orderBy"]')).toHaveValue("updatedDate");
  await expect(page.locator('input[name="orderDir"]')).toHaveValue("desc");
});

test("current-user issues sort filter uses button side-effect control with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);
  await expect(page.locator('.filter-wrap .filters a[href="#"]')).toHaveCount(0);
  const dueDateFilter = page.locator(".filter-wrap button.filter").filter({ hasText: "Due Date" });
  await expect(dueDateFilter).toHaveAttribute("type", "button");
  await expect(dueDateFilter).toHaveClass("filter");
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
  await expect(page.locator('.filter-wrap button.filter.active[orderBy="dueDate"]')).toHaveText(
    "Due Date",
  );
  await expect(page.locator('input[name="orderBy"]')).toHaveValue("dueDate");
  await expect(page.locator('input[name="orderDir"]')).toHaveValue("desc");
  await expect(page.locator('input[name="state"]')).toHaveValue("open");
});

test("current-user issues single-item list keeps legacy empty filter wrapper", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForSingleItem(page);

  await page.goto(`${basePath}/user/issues`);

  await expect(page.locator("#span10 > .filter-wrap.small-heights")).toHaveCount(1);
  await expect(
    page.locator("#span10 > .filter-wrap.small-heights > .filters.pull-right"),
  ).toHaveCount(0);
  await expect(page.locator(".post-list-wrap.my-issues .post-item")).toHaveCount(1);
});

test("current-user issues quick filter uses button pjax hooks with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForQuickFilters(page);

  await page.goto(`${basePath}/user/issues`);
  await expect(page.locator('.left-menu .lst-stacked a[href="#"]')).toHaveCount(0);
  const favoriteFilter = page
    .locator(".left-menu .lst-stacked button")
    .filter({ hasText: "Favorite" });
  await expect(favoriteFilter).toHaveAttribute("type", "button");
  await expect(favoriteFilter).toHaveAttribute("pjax-filter", "");
  await expect(favoriteFilter).toHaveAttribute("data-author-id", "");
  await expect(favoriteFilter).toHaveAttribute("data-assignee-id", "");
  await expect(favoriteFilter).toHaveAttribute("data-commenter-id", "");
  await expect(favoriteFilter).toHaveAttribute("data-milestone-id", "");
  await expect(favoriteFilter).toHaveAttribute("data-mention-id", "");
  await expect(favoriteFilter).toHaveAttribute("data-sharer-id", "");
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
  await expect(page.locator(".left-menu .lst-stacked li.active button")).toHaveText("Favorite(1)");
  await expect(page.locator('input[name="authorId"]')).toHaveValue("");
  await expect(page.locator('input[name="assigneeId"]')).toHaveValue("");
  await expect(page.locator('input[name="commenterId"]')).toHaveValue("");
  await expect(page.locator('input[name="mentionId"]')).toHaveValue("");
  await expect(page.locator('input[name="sharerId"]')).toHaveValue("");
  await expect(page.locator('input[name="favoriteId"]')).toHaveValue("1");
  await expect(page.locator('input[name="state"]')).toHaveValue("open");
});

test("current-user issues quick filter zero counts follow legacy blank-filter rendering", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForZeroQuickFilterCounts(page);

  await page.goto(`${basePath}/user/issues`);

  await expect(page.locator(".left-menu .mentioned-of-me").locator("..")).toHaveText(
    "Mentioned(0)",
  );
  await expect(page.locator(".left-menu .shared-with-me").locator("..")).toHaveText("Shared(0)");
  await expect(page.locator(".left-menu .favorite-issue").locator("..")).toHaveText("Favorite(0)");
});

test("current-user issues two-column mode toggle follows legacy yona.twoColumnMode localStorage branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();
  const toggle = page.locator("#two-column-mode");
  const row = page.locator("#issue-item-42");
  await expect(toggle).not.toBeChecked();
  await expect(row).not.toHaveCSS("cursor", "pointer");

  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(row).toHaveCSS("cursor", "pointer");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("true");

  await page.reload();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await expect(page.locator("#issue-item-42")).toHaveCSS("cursor", "pointer");

  await page.locator("#two-column-mode").click();
  await expect(page.locator("#two-column-mode")).not.toBeChecked();
  await expect(page.locator("#issue-item-42")).not.toHaveCSS("cursor", "pointer");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("false");
});

test("current-user issues show-subtasks toggle follows legacy yona.showSubtask localStorage behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);
  await page.evaluate(() => localStorage.removeItem("showSubtasksAlways"));
  await page.reload();
  const toggle = page.locator("#toggle-show-subtasks");
  const childList = page.locator("#issue-item-42 .child-issue-list");
  await expect(toggle).not.toBeChecked();
  await expect(childList).not.toBeVisible();
  await expect(page.locator(".child-issue-list .issue-item.child-issue")).toHaveCount(2);

  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(childList).toBeVisible();
  await expect(childList).toHaveAttribute("style", "display: block;");
  await expect(page.locator(".child-issue-list .issue-item.child-issue").first()).toContainText(
    "Open child issue - Dev Member",
  );
  await expect(page.locator(".child-issue-list .issue-item.child-issue").last()).toContainText(
    "Closed child issue",
  );
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("showSubtasksAlways")))
    .toBe("true");

  await page.reload();
  await expect(page.locator("#toggle-show-subtasks")).toBeChecked();
  await expect(page.locator("#issue-item-42 .child-issue-list")).toBeVisible();

  await page.locator("#toggle-show-subtasks").click();
  await expect(page.locator("#toggle-show-subtasks")).not.toBeChecked();
  await expect(page.locator("#issue-item-42 .child-issue-list")).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("showSubtasksAlways")))
    .toBe("false");
});

test("current-user issues subtask summary follows legacy partial_list_subtask", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);

  const parentSummary = page.locator("#issue-item-42 .for-subtask-progressbar");
  await expect(
    parentSummary.locator(".subtask-progress.upload-progress.red-outline"),
  ).toBeVisible();
  await expect(parentSummary.locator(".bar.red")).toHaveAttribute("title", "Subtask");
  await expect(parentSummary.locator(".bar.red")).toHaveAttribute("style", "width: 50%;");
  await expect(parentSummary.locator(".completion-ratio")).toHaveText("1/2");
  await expect(parentSummary.locator(".completion-ratio")).not.toHaveClass(/(^|\s)txt-green(\s|$)/);

  const childSummary = page.locator("#issue-item-43 .for-subtask-progressbar .subtask a");
  await expect(childSummary).toHaveAttribute("href", `${basePath}/admin/sample/issue/11`);
  await expect(childSummary).toHaveText("#11 Parent iss...");
});

test("current-user issues weight arrows follow legacy my_partial_list markup", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);

  const upWeight = page.locator("#issue-item-42 .title-cell .weight-up-arrow");
  await expect(upWeight).toHaveAttribute("data-toggle", "tooltip");
  await expect(upWeight).toHaveAttribute("data-placement", "right");
  await expect(upWeight).toHaveAttribute("title", "Issue weight 2");
  await expect(upWeight.locator(".yobicon-angle-circled-up")).toBeVisible();

  const downWeight = page.locator("#issue-item-43 .title-cell .weight-down-arrow");
  await expect(downWeight).toHaveAttribute("data-toggle", "tooltip");
  await expect(downWeight).toHaveAttribute("data-placement", "right");
  await expect(downWeight).toHaveAttribute("title", "Issue weight -1");
  await expect(downWeight.locator(".yobicon-angle-circled-down")).toBeVisible();
  await expect(page.locator(".title-cell .issue-weight")).toHaveCount(0);
});

test("current-user issues row project and meta wrappers follow legacy my_partial_list", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);

  const projectName = page.locator("#issue-item-42 .project-name-in-my-issues").first();
  await expect(projectName.locator("> .infos-item.project-name > a.title.project")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(projectName.locator("> .infos-item.project-name > a.title.project")).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(projectName.locator("> .infos-item.project-name > a.title.project")).toHaveAttribute(
    "data-placement",
    "bottom",
  );
  await expect(projectName.locator("> .infos-item.post-id")).toHaveText("#11");

  const desktopAuthor = page.locator(
    "#issue-item-42 > .span12 > .author .infos-item.infos-link-item.author-cell",
  );
  await expect(desktopAuthor).toHaveAttribute("href", `${basePath}/alice`);
  await expect(desktopAuthor).toHaveAttribute("data-toggle", "tooltip");
  await expect(desktopAuthor).toHaveAttribute("data-placement", "bottom");
  await expect(desktopAuthor).toHaveAttribute("title", "alice");

  const metaCell = page.locator("#issue-item-42 .infos.meta > .meta-cell");
  await expect(metaCell.locator("> .hide.show-in-mobile .author-cell")).toHaveText("Alice");
  await expect(metaCell.locator("> .hide.show-in-mobile .author-cell")).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(metaCell.locator("> .hide.show-in-mobile .author-cell")).toHaveAttribute(
    "data-placement",
    "bottom",
  );
  await expect(metaCell.locator("> .infos-item")).toHaveAttribute("data-toggle", "tooltip");
  await expect(metaCell.locator("> .infos-item")).toHaveAttribute("data-placement", "bottom");
  await expect(metaCell.locator("> .infos-item")).toHaveAttribute("title", "Created at 2026-06-30");
  await expect(metaCell.locator("> .mileston-tag > a")).toHaveAttribute("data-toggle", "tooltip");
  await expect(metaCell.locator("> .mileston-tag > a")).toHaveAttribute("data-placement", "bottom");
  await expect(metaCell.locator("> .mileston-tag > a")).toHaveAttribute("title", "Milestone");
  await expect(metaCell.locator("> .pull-right")).toHaveAttribute("title", "Due date: 2026-07-05");
  await expect(metaCell.locator("> .pull-right")).toHaveText("5 days left");

  const updatedMetaCell = page.locator("#issue-item-43 .infos.meta > .meta-cell > .infos-item");
  await expect(updatedMetaCell).toHaveText("2026-07-01");
  await expect(updatedMetaCell).toHaveAttribute("title", "Last Updated 2026-07-01");
});

test("current-user issues missing author follows legacy issue.noAuthor branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForNoAuthor(page);

  await page.goto(`${basePath}/user/issues`);

  const desktopAuthor = page.locator("#issue-item-42 > .span12 > .author");
  await expect(desktopAuthor.locator("> .infos-item")).toHaveText("No author");
  await expect(desktopAuthor.locator("a.author-cell")).toHaveCount(0);

  const mobileAuthor = page.locator("#issue-item-42 .infos.meta .hide.show-in-mobile");
  await expect(mobileAuthor.locator("> .infos-item")).toHaveText("No author");
  await expect(mobileAuthor.locator("a.author-cell")).toHaveCount(0);
});

test("current-user issues assignee avatar column follows legacy authored-tab branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues?filter=authored`);

  const assignee = page.locator("#issue-item-42 .avatar-wrap.assinee");
  await expect(assignee).toHaveAttribute("href", `${basePath}/admin`);
  await expect(assignee).toHaveAttribute("data-toggle", "tooltip");
  await expect(assignee).toHaveAttribute("data-placement", "bottom");
  await expect(assignee).toHaveAttribute("title", "Assignee: Admin");
  await expect(assignee.locator("img")).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-32.png",
  );
  await expect(assignee.locator("img")).toHaveAttribute("width", "32");
  await expect(assignee.locator("img")).toHaveAttribute("height", "32");
  await expect(assignee.locator("img")).toHaveAttribute("alt", "Admin");
  await expect(page.locator("#issue-item-42 > .span12 > .infos.meta")).toHaveClass(
    /(^|\s)span2(\s|$)/,
  );
});

test("current-user issues omits assignee avatar when legacy assignee name is absent", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForBlankAssigneeName(page);

  await page.goto(`${basePath}/user/issues?filter=authored`);

  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee")).toHaveCount(0);
  await expect(page.locator("#issue-item-42 > .span12 > .infos.meta")).toHaveClass(
    /(^|\s)span3(\s|$)/,
  );
});

test("current-user issues set-default-login-page button follows legacy success branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);
  const setDefaultRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      request.method() === "POST" &&
      url.pathname === `${basePath}/user/defultLoginPage` &&
      url.searchParams.get("path") === "/user/issues"
    );
  });
  await page.route("**/user/defultLoginPage?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ defaultLoginPage: "/user/issues" }),
    });
  });

  await page.goto(`${basePath}/user/issues`);
  const setDefaultButton = page.locator("#setDefaultLoginPage");
  await expect(setDefaultButton).toBeVisible();
  await expect(setDefaultButton).toHaveAttribute("data-url", "user/issues");
  await setDefaultButton.click();
  await setDefaultRequest;

  await expect(setDefaultButton).not.toBeVisible();
  await expect(page.locator(".yobiToasts .toast .msg")).toHaveText("Set to default: user/issues");
});

test("current-user issues label text contrast follows legacy labelTextColorAdjust", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);
  await expect(page.locator('.title-cell > .label[data-label-id="8"]').first()).toHaveClass(
    /(^|\s)white(\s|$)/,
  );
  await expect(page.locator('.title-cell > .label[data-label-id="9"]')).toHaveClass(
    /(^|\s)dimgray(\s|$)/,
  );
  await expect(page.locator(".child-issue-list .label[data-label-id='8']")).toHaveClass(
    /(^|\s)white(\s|$)/,
  );
});

test("current-user issues row label links follow legacy my_partial_list open-state URL", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues?state=closed`);

  const label = page.locator('#issue-item-42 .title-cell > .label[data-label-id="8"]');
  await expect(label).toHaveText("bug");
  await expect(label).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?state=open&labelIds=8`,
  );
});

test("current-user issues pagination follows legacy yobi.Pagination input behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);
  await expect(page.locator("#pagination a[pjax-page]")).toHaveCount(0);
  const nextPage = page.locator("#pagination a").last();
  await expect(nextPage).toHaveAttribute(
    "href",
    `${basePath}/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=2&state=open`,
  );
  await expect(nextPage).not.toHaveAttribute("aria-current", /.+/u);
  await expect(nextPage).not.toHaveAttribute("data-status", /.+/u);
  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "user-issues-pagination";
  });

  await nextPage.click();

  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("2");
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("user-issues-pagination");
  await expect(page.locator("#pagination a")).toHaveCount(2);
  await expect(page.locator("#pagination a[aria-current]")).toHaveCount(0);
  await expect(page.locator("#pagination a[data-status]")).toHaveCount(0);

  const pageInput = page.locator('#pagination input[name="pageNum"][type="number"]');
  await expect(pageInput).toHaveAttribute("max", "3");
  await expect(pageInput).toHaveValue("2");
  await pageInput.click();
  await pageInput.fill("1.5");
  await pageInput.press("Enter");
  await expect(pageInput).toHaveValue("2");
  await expect(page).toHaveURL(
    `${basePath}/user/issues?filter=assigned&orderBy=updatedDate&orderDir=desc&pageNum=2&state=open`,
  );
  await pageInput.click();
  await pageInput.fill("9");
  await pageInput.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum") ?? "1").toBe("3");
});

test("current-user issues row click reveals child list and hover follows legacy yobi.issue.List", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockUserIssuesForFilterLinks(page);

  await page.goto(`${basePath}/user/issues`);
  await page.evaluate(() => localStorage.removeItem("showSubtasksAlways"));
  await page.reload();
  const row = page.locator("#issue-item-42");
  const childList = page.locator("#issue-item-42 .child-issue-list");
  await expect(childList).not.toBeVisible();

  await row.hover();
  await expect(row).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await page.mouse.move(0, 0);
  await expect(row).not.toHaveCSS("background-color", "rgb(250, 250, 250)");

  await row.locator(".infos.meta").click();
  await expect(childList).toBeVisible();
  await expect(childList).toHaveAttribute("style", "display: block;");
  await expect(page.locator(".child-issue-list .issue-item.child-issue").first()).toContainText(
    "Open child issue - Dev Member",
  );
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

async function mockUserIssuesForSingleItem(page: Page) {
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
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 0,
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
            title: "Only issue",
            voterCount: 0,
          },
        ],
        openIssueCount: 1,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: { favorite: 0, mentioned: 0, shared: 0 },
        state: "open",
        totalCount: 1,
        totalPages: 1,
        viewerUserId: 1,
      }),
    });
  });
}

async function mockUserIssuesForNoAuthor(page: Page) {
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
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 0,
        filter: "assigned",
        items: [
          {
            assigneeLoginId: "admin",
            authorLabel: "",
            authorLoginId: "ghost",
            commentCount: 0,
            createdLabel: "2026-06-30",
            id: 42,
            issueNumber: 11,
            labels: [],
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "No author issue",
            voterCount: 0,
          },
        ],
        openIssueCount: 1,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: { favorite: 0, mentioned: 0, shared: 0 },
        state: "open",
        totalCount: 1,
        totalPages: 1,
        viewerUserId: 1,
      }),
    });
  });
}

async function mockUserIssuesForBlankAssigneeName(page: Page) {
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
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 0,
        filter: "authored",
        items: [
          {
            assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
            assigneeLabel: "",
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
            title: "Blank assignee name issue",
            voterCount: 0,
          },
        ],
        openIssueCount: 1,
        pageNum: 1,
        pageSize: 20,
        sideFilterCounts: { favorite: 0, mentioned: 0, shared: 0 },
        state: "open",
        totalCount: 1,
        totalPages: 1,
        viewerUserId: 1,
      }),
    });
  });
}

async function mockUserIssuesForZeroQuickFilterCounts(page: Page) {
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
    const pageNum = Number(url.searchParams.get("pageNum")) || 1;
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
            childClosedCount: 1,
            childIssues: [
              {
                assigneeLabel: "Dev Member",
                commentCount: 2,
                createdLabel: "2026-07-03",
                id: 13,
                issueNumber: 13,
                labels: [
                  {
                    categoryId: 3,
                    categoryName: "bug",
                    color: "#51aacc",
                    id: 8,
                    name: "bug",
                  },
                ],
                state: "open",
                title: "Open child issue",
                voterCount: 1,
              },
              {
                assigneeLabel: "",
                commentCount: 0,
                createdLabel: "2026-07-04",
                id: 14,
                issueNumber: 14,
                labels: [],
                state: "closed",
                title: "Closed child issue",
                voterCount: 0,
              },
            ],
            childOpenCount: 1,
            commentCount: 0,
            createdLabel: "2026-06-30",
            dueDateLabel: "2026-07-05",
            dueDateText: "5 days left",
            id: 42,
            issueNumber: 11,
            labels: [
              { color: "#51aacc", id: 8, name: "bug" },
              { color: "#ffffcc", id: 9, name: "light" },
            ],
            milestoneId: 5,
            milestoneTitle: "v1.0",
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: `First ${orderBy} ${orderDir}`,
            voterCount: 0,
            weight: 2,
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
            parentIssueNumber: 11,
            parentIssueTitle: "Parent issue title",
            projectName: "sample",
            state: "open",
            title: "Second issue",
            updatedLabel: "2026-07-01",
            voterCount: 0,
            weight: -1,
          },
        ],
        openIssueCount: 2,
        pageNum,
        pageSize: 20,
        sideFilterCounts: { favorite: 1, mentioned: 2, shared: 1 },
        state: "open",
        totalCount: 2,
        totalPages: 3,
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
        "data-pjax",
        "data-trigger",
        "data-toggle",
        "data-placement",
        "data-content",
        "data-label-id",
      ];
      const attrs = stableAttributes
        .filter((name) => current.hasAttribute(name))
        .map((name) => normalizeAttribute(current, name))
        .filter(Boolean)
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
    function normalizeAttribute(current: Element, name: string) {
      if (name === "class") {
        const className = (current.getAttribute(name) ?? "")
          .split(/\s+/)
          .filter((value, index, values) => value && values.indexOf(value) === index)
          .filter(
            (value) =>
              !(
                value === "active" &&
                current.tagName.toLowerCase() === "a" &&
                current.closest(".page-wrap > .nav-tabs")
              ),
          )
          .join(" ");
        return className ? `${name}=${JSON.stringify(className)}` : "";
      }
      return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
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
          "data-pjax",
          "data-trigger",
          "data-toggle",
          "data-placement",
          "data-content",
          "data-label-id",
        ];
        const attrs = stableAttributes
          .filter((name) => current.hasAttribute(name))
          .map((name) => normalizeAttribute(current, name))
          .filter(Boolean)
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
      function normalizeAttribute(current: Element, name: string) {
        if (name === "class") {
          const className = (current.getAttribute(name) ?? "")
            .split(/\s+/)
            .filter((value, index, values) => value && values.indexOf(value) === index)
            .filter(
              (value) =>
                !(
                  value === "active" &&
                  current.tagName.toLowerCase() === "a" &&
                  current.closest(".page-wrap > .nav-tabs")
                ),
            )
            .join(" ");
          return className ? `${name}=${JSON.stringify(className)}` : "";
        }
        return `${name}=${JSON.stringify(current.getAttribute(name) ?? "")}`;
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
