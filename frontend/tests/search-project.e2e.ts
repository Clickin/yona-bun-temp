import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const PROJECT_SEARCH_ROUTE_SOURCE = readFileSync(
  "src/routes/$ownerName/$projectName/search.tsx",
  "utf8",
);

const EXPECTED_PROJECT_SEARCH_CATEGORIES = [
  { label: "Issues", type: "issue" },
  { label: "Users", type: "user" },
  { label: "Posts", type: "post" },
  { label: "Milestones", type: "milestone" },
  { label: "Issue Comments", type: "issue_comment" },
  { label: "Post Comments", type: "post_comment" },
  { label: "Code Reviews", type: "review" },
];

const EXPECTED_PROJECT_SEARCH = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class="active empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/admin/sample/search"><input type="hidden" name="searchType" value="review"><input type="text" id="searchKeyword" name="keyword" class="span11" value="missing"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>0</strong> result(s) in Code Reviews</h3></div><div class="search-result-wrap"><div class="empty-result"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

const EXPECTED_PROJECT_ISSUE_SEARCH = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li>
      <li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="site-breadcrumb-outer"><div class="site-breadcrumb-inner"><h3>Search</h3></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class="active "><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/admin/sample/search"><input type="hidden" name="searchType" value="issue"><input type="text" id="searchKeyword" name="keyword" class="span11" value="sample"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Issues</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><span class="post-id">#11</span><a href="__BASE_PATH__/admin/sample/issue/11" class="title">Fix <strong class="keyword">sample</strong> issue</a></div><div class="search-content"><p class="search-content-body"><strong class="keyword">Sample</strong>body.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/dev" class="meta-item" title="dev">Dev Member</a><span class="meta-item" title="Jul 1, 2026">Jul 1, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project search matches legacy search/result.scala.html project empty review DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=missing&searchType=review`);
  await expect(page).toHaveTitle("Search - admin/sample");
  await expect
    .poll(() => page.locator("head > title").allTextContents())
    .toContain("Search - admin/sample");
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();
  expect(
    await page
      .locator(
        ".unsupported, [data-stylex-owner=global-gnb-outer], .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, [data-stylex-owner=site-footer]",
      )
      .evaluateAll((roots) =>
        roots.map((root) =>
          root.getAttribute("data-stylex-owner") === "site-footer" &&
          !root.classList.contains("page-footer-outer")
            ? "site-footer"
            : root.className,
        ),
      ),
  ).toEqual([
    "unsupported hidden",
    "gnb-outer project-header",
    "project-header-outer",
    "project-menu-outer",
    "site-breadcrumb-outer",
    "page-wrap-outer",
    "site-footer",
  ]);
  await expectProjectSearchShell(page);
  await expectProjectSearchForm(page, basePath, "review", "missing");
  await expect(page.locator(".project-menu-outer .project-menu-nav li.active")).toHaveCount(0);
  await expectProjectSearchCategoryAttributes(page, basePath, "missing");
  await expect(page.locator(".search-result-wrap").locator("> .empty-result")).toHaveCount(1);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedProjectSearchShellScreen(basePath)),
  );
});

test("project search route source renders legacy projectLayout title without direct document mutation", () => {
  expect(PROJECT_SEARCH_ROUTE_SOURCE).toContain(
    '<title>{`${t("title.search")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(PROJECT_SEARCH_ROUTE_SOURCE).toContain("includeHash: true");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).toMatch(
    /project-search-category-list[\s\S]*<Link[\s\S]*activeOptions=\{projectSearchPaginationLinkActiveOptions\}[\s\S]*activeProps=\{projectSearchPaginationLinkActiveProps\}[\s\S]*from="\/\$ownerName\/\$projectName\/search"/u,
  );
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("createLink");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain('data-toggle="tooltip"');
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("data-placement");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain('"data-toggle": "search-category"');
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain('"data-type": searchCategoryType');
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("<a ");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("<Link\n                          data-");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain('href="#"');
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("document.title");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("document.querySelector");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("addEventListener");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("classList");
  expect(PROJECT_SEARCH_ROUTE_SOURCE).not.toContain("globalThis.document");
});

test("project issue search renders legacy partial_issues.scala.html scoped result row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=sample&searchType=issue`);

  await expect(page).toHaveURL(`${basePath}/admin/sample/search?keyword=sample&searchType=issue`);
  await expectProjectSearchShell(page);
  await expectProjectSearchForm(page, basePath, "issue", "sample");
  await expect(page.locator('[data-stylex-owner="project-search-category-list"] li')).toHaveCount(7);
  await expect(page.locator('[data-stylex-owner="project-search-category-list"]')).not.toContainText("Projects");
  await expect(page.locator('[data-stylex-owner="project-search-category-item"][data-stylex-active="true"]')).toHaveText("Issues 1");
  await expect(page.locator(".search-result-title")).toHaveText("Found 1 result(s) in Issues");
  await expect(page.locator(".search-result-title strong")).toHaveText("1");
  await expect(page.locator(".search-result-wrap > .search-list-wrap")).toHaveCount(1);

  const row = page.locator(".search-result-wrap .search-list-item");
  await expect(row).toHaveCount(1);
  expect(
    await row.evaluate((element) => Array.from(element.children).map((child) => child.className)),
  ).toEqual(["title-wrap", "search-content", "search-meta-info"]);
  await expect(row.locator(".title-wrap .post-id")).toHaveText("#11");
  await expect(row.locator(".title-wrap a.title")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/11`,
  );
  await expect(row.locator(".title-wrap a.title")).toHaveText("Fix sample issue");
  await expect(row.locator(".title-wrap a.title strong.keyword")).toHaveText("sample");
  await expect(row.locator(".search-content-body")).toHaveText("Sample body .....");
  await expect(row.locator(".search-content-body strong.keyword")).toHaveText("Sample");
  await expect(row.locator(".search-meta-info .project-link.meta-item")).toHaveCount(0);

  const author = row.locator(".search-meta-info a.meta-item");
  await expect(author).toHaveAttribute("href", `${basePath}/dev`);
  await expect(author).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(author).not.toHaveAttribute("data-placement");
  await expect(author).toHaveAttribute("title", "dev");
  await expect(author).toHaveText("Dev Member");
  await expect(row.locator(".search-meta-info span.meta-item")).toHaveAttribute(
    "title",
    "Jul 1, 2026",
  );
  await expect(page.locator(".search-result-wrap #pagination")).toBeEmpty();

  const layout = await page.evaluate(() => {
    const row = document.querySelector(".row-fluid");
    const category = document.querySelector('[data-stylex-owner="project-search-category-list"]');
    const searchBox = document.querySelector(".search-box-wrap");
    const keyword = document.querySelector("#searchKeyword");
    const button = document.querySelector("#searchInnerForm .ybtn");
    const title = document.querySelector(".search-result-title");
    const resultRow = document.querySelector(".search-list-item");
    if (!row || !category || !searchBox || !keyword || !button || !title || !resultRow) {
      return null;
    }
    return {
      button: button.getBoundingClientRect(),
      category: category.getBoundingClientRect(),
      keyword: keyword.getBoundingClientRect(),
      resultRow: resultRow.getBoundingClientRect(),
      row: row.getBoundingClientRect(),
      searchBox: searchBox.getBoundingClientRect(),
      title: title.getBoundingClientRect(),
    };
  });
  expect(layout).not.toBeNull();
  expect(layout!.category.top).toBeGreaterThanOrEqual(layout!.row.top);
  expect(layout!.category.top).toBeLessThanOrEqual(layout!.searchBox.top + 1);
  expect(layout!.category.right).toBeLessThanOrEqual(layout!.searchBox.left);
  expect(layout!.searchBox.right).toBeLessThanOrEqual(layout!.row.right + 1);
  expect(layout!.keyword.top).toBeCloseTo(layout!.button.top, 0);
  expect(layout!.keyword.bottom).toBeCloseTo(layout!.button.bottom, 0);
  expect(layout!.keyword.right).toBeLessThan(layout!.searchBox.right);
  expect(layout!.title.top).toBeGreaterThan(layout!.keyword.bottom);
  expect(layout!.resultRow.top).toBeGreaterThan(layout!.title.bottom);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedProjectIssueSearchScreen(basePath)),
  );
});

test("project issue search category Links keep legacy active state on list items", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=sample&searchType=issue`);

  await expect(page).toHaveURL(`${basePath}/admin/sample/search?keyword=sample&searchType=issue`);
  await expect(page.locator('[data-stylex-owner="project-search-category-item"][data-stylex-active="true"]')).toHaveText("Issues 1");
  await expectProjectSearchCategoryAttributes(page, basePath, "sample");
  await expectProjectSearchCategoryActiveMarkers(page);
});

test("project issue comment search renders legacy partial_issue_comments.scala.html scoped result row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=sample&searchType=issue_comment`);

  await expectProjectSearchShell(page);
  await expectProjectSearchForm(page, basePath, "issue_comment", "sample");
  await expect(page.locator('[data-stylex-owner="project-search-category-list"] li')).toHaveCount(7);
  await expect(page.locator('[data-stylex-owner="project-search-category-list"]')).not.toContainText("Projects");
  await expect(page.locator('[data-stylex-owner="project-search-category-item"][data-stylex-active="true"]')).toHaveText("Issue Comments 1");
  await expect(page.locator(".search-result-title")).toHaveText(
    "Found 1 result(s) in Issue Comments",
  );
  await expect(page.locator(".search-result-title strong")).toHaveText("1");
  await expect(page.locator(".search-result-wrap > .search-list-wrap")).toHaveCount(1);

  const row = page.locator(".search-result-wrap .search-list-item");
  await expect(row).toHaveCount(1);
  expect(
    await row.evaluate((element) => Array.from(element.children).map((child) => child.className)),
  ).toEqual(["title-wrap", "search-content", "search-meta-info"]);
  await expect(row.locator(".title-wrap .post-id")).toHaveText("#11");

  const titleLink = row.locator(".title-wrap a");
  await expect(titleLink).toHaveAttribute("href", `${basePath}/admin/sample/issue/11#comment-77`);
  await expect(titleLink).toHaveText("Re) Fix sample issue");

  await expect(row.locator(".search-content-body")).toHaveText("Sample comment");
  await expect(row.locator(".search-meta-info .project-link.meta-item")).toHaveCount(0);

  const author = row.locator(".search-meta-info a.meta-item");
  await expect(author).toHaveAttribute("href", `${basePath}/dev`);
  await expect(author).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(author).not.toHaveAttribute("data-placement");
  await expect(author).toHaveAttribute("title", "dev");
  await expect(author).toHaveText("Dev Member");
  await expect(row.locator(".search-meta-info span.meta-item")).toHaveAttribute(
    "title",
    "Jul 1, 2026",
  );
  await expect(row.locator(".search-meta-info span.meta-item")).toHaveText("Jul 1, 2026");
  await expect(page.locator(".search-result-wrap #pagination")).toBeEmpty();
});

test("project user search preserves legacy tooltip metadata without Bootstrap initializer marker", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=sample&searchType=user`);

  await expectProjectSearchShell(page);
  await expectProjectSearchForm(page, basePath, "user", "sample");
  await expect(page.locator('[data-stylex-owner="project-search-category-item"][data-stylex-active="true"]')).toHaveText("Users 1");
  await expect(page.locator(".search-result-title")).toHaveText("Found 1 result(s) in Users");

  const row = page.locator(".search-result-wrap .search-list-item.project");
  await expect(row).toHaveCount(1);

  const avatar = row.locator("a.avatar-wrap");
  await expect(avatar).toHaveAttribute("href", `${basePath}/dev`);
  await expect(avatar).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(avatar).not.toHaveAttribute("data-placement");
  await expect(avatar).toHaveAttribute("title", "dev");
  await expect(avatar.locator("img")).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-32.png",
  );
  await expect(row.locator(".title-wrap a.title.user-link")).toHaveText("Dev Member (@dev)");
  await expect(row.locator(".infos .infos-item")).toHaveText("Member since Jul 1, 2026");
  await expect(page.locator('.search-result-wrap [data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator(".search-result-wrap [data-placement]")).toHaveCount(0);
});

test("project search pins the live localhost issue-comment zero-result project shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page, {
    anonymousViewer: true,
    localhostIssueCommentZeroResult: true,
    project: {
      boardCount: 1,
      menuSetting: undefined,
      openIssueCount: 1,
      openPullRequestCount: 1,
      reviewCount: 2,
      showBoard: true,
      showCode: true,
      showIssue: true,
      showMilestone: true,
      showPullRequest: true,
      showReview: true,
      viewerCanUpdate: false,
    },
  });

  await page.goto(`${basePath}/admin/sample/search?keyword=sample&searchType=issue_comment`);

  await expect(page).toHaveTitle("Search - admin/sample");
  await expectProjectSearchShell(page);
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator('[data-stylex-owner="global-gnb-nav"]')).toContainText("List All");
  await expect(page.locator('[data-stylex-owner="global-gnb-nav"]')).toContainText("Feedback");
  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] form.gnb-search-form'),
  ).toHaveAttribute("action", `${basePath}/admin/sample/search`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const scopeButtons = page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button");
  await expect(scopeButtons).toHaveText(["This Project", "All Projects"]);
  await expect(scopeButtons.locator("[data-toggle], [data-action]")).toHaveCount(0);
  await expect(page.locator(".gnb-usermenu")).toContainText("Log in");
  await expect(page.locator(".gnb-usermenu")).toContainText("Sign up");
  await expect(page.locator(".project-menu-gruop .project-menu-count")).toHaveText([
    "1",
    "1",
    "2",
    "1",
  ]);
  await expect(page.locator(".project-setting")).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="project-search-category-list"] li')).toHaveCount(7);
  await expect(page.locator('[data-stylex-owner="project-search-category-item"][data-stylex-active="true"]')).toHaveText("Issue Comments 0");
  await expect(page.locator(".search-result-title")).toHaveText(
    "Found 0 result(s) in Issue Comments",
  );
  await expect(page.locator(".search-result-title strong")).toHaveText("0");
  await expect(page.locator(".search-result-wrap > .empty-result")).toHaveCount(1);

  const layout = await page.evaluate(() => {
    const navbar = document.querySelector("[data-stylex-owner=global-gnb-outer]");
    const form = document.querySelector(".gnb-search-form");
    const scope = document.querySelector("#gnb-search-scope-title");
    const searchBox = document.querySelector('[data-stylex-owner="global-gnb-search-box"]');
    const searchInput = document.querySelector('[data-stylex-owner="global-gnb-search-input"]');
    const category = document.querySelector('[data-stylex-owner="project-search-category-list"]');
    const searchTitle = document.querySelector(".search-result-title");
    const emptyResult = document.querySelector(".search-result-wrap > .empty-result");
    if (
      !navbar ||
      !form ||
      !scope ||
      !searchBox ||
      !searchInput ||
      !category ||
      !searchTitle ||
      !emptyResult
    ) {
      return null;
    }
    return {
      category: category.getBoundingClientRect(),
      emptyResult: emptyResult.getBoundingClientRect(),
      form: form.getBoundingClientRect(),
      navbar: navbar.getBoundingClientRect(),
      scope: scope.getBoundingClientRect(),
      searchBox: searchBox.getBoundingClientRect(),
      searchInput: searchInput.getBoundingClientRect(),
      searchTitle: searchTitle.getBoundingClientRect(),
    };
  });
  expect(layout).not.toBeNull();
  expect(layout!.form.top).toBeGreaterThanOrEqual(layout!.navbar.top);
  expect(layout!.form.bottom).toBeLessThanOrEqual(layout!.navbar.bottom + 1);
  expect(layout!.scope.top).toBeGreaterThanOrEqual(layout!.navbar.top);
  expect(layout!.scope.bottom).toBeLessThanOrEqual(layout!.navbar.bottom + 1);
  expect(layout!.searchInput.top).toBeGreaterThanOrEqual(layout!.navbar.top);
  expect(layout!.searchInput.bottom).toBeLessThanOrEqual(layout!.navbar.bottom + 1);
  expect(layout!.scope.right).toBeLessThanOrEqual(layout!.searchBox.left + 1);
  expect(layout!.category.right).toBeLessThanOrEqual(layout!.searchTitle.left + 1);
  expect(layout!.emptyResult.top).toBeGreaterThan(layout!.searchTitle.bottom);
});

test("project issue search pagination keeps legacy pageNum through SPA navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=paged&searchType=issue&pageNum=1`);

  const pagination = page.locator("#pagination.page-navigation-wrap");
  await expect(pagination).toBeVisible();
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("1");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveAttribute("max", "3");

  const next = pagination.locator(".page-num.ikon a", { hasText: "Next" });
  await expect(next).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/search?keyword=paged&pageNum=2&searchType=issue`,
  );
  await next.click();

  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(pagination.locator('input[name="pageNum"]')).toHaveValue("2");
  expect(searchApi.pageNums).toContain(2);
});

test("project search without required query renders legacy badrequest_default.scala.html shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search`);
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "The request cannot be fulfilled due to bad syntax",
  );
  const homeButton = page.locator(".error-wrap .ybtn.ybtn-info");
  await expect(homeButton).toHaveAttribute("href", `${basePath}/`);
  await expectProjectSearchErrorShell(page, {
    expectProjectHeader: false,
    expectProjectMenu: false,
    expectSiteBreadcrumb: false,
    expectedRootOrder: ["unsupported hidden", "gnb-outer", "page-wrap-outer", "page-footer-outer"],
  });
  await expect(page.locator("#searchInnerForm")).toHaveCount(0);
  expect(searchApi.count).toBe(0);
  await markSearchSpaSession(page);
  await homeButton.click();
  await expectExactProjectSearchSpaPath(page, `${basePath}/`);
});

test("project search renders legacy error/forbidden.scala.html shell for anonymous viewers", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page, { anonymousViewer: true });

  await page.goto(`${basePath}/admin/sample/search?keyword=forbidden&searchType=issue&pageNum=1`);
  await expectProjectSearchErrorShell(page, {
    expectProjectHeader: true,
    expectProjectMenu: true,
    expectSiteBreadcrumb: false,
    expectedRootOrder: [
      "unsupported hidden",
      "gnb-outer project-header",
      "project-header-outer",
      "project-menu-outer",
      "page-wrap-outer",
      "site-footer",
    ],
  });
  await expect(page.locator(".project-menu-outer .project-menu-gruop > li.active")).toHaveCount(1);
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-outer")).toHaveCount(1);
  await expect(
    page.locator(".project-menu-outer .project-menu-gruop > li.active a"),
  ).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(page.locator(".error-wrap .ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText("You are not authorized");
  await expect(page.locator(".search-box-wrap")).toHaveCount(0);
  const loginButton = page.locator(".error-wrap .ybtn.ybtn-primary");
  await expect(loginButton).toHaveText("Log in");
  await expect(loginButton).toHaveAttribute(
    "href",
    `${basePath}/users/loginform?redirectUrl=${encodeURIComponent(
      `${basePath}/admin/sample/search?keyword=forbidden&searchType=issue&pageNum=1`,
    )}`,
  );
  await markSearchSpaSession(page);
  await loginButton.click();
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        redirectUrl: url.searchParams.get("redirectUrl"),
      };
    })
    .toEqual({
      pathname: `${basePath}/users/loginform`,
      redirectUrl: `${basePath}/admin/sample/search?keyword=forbidden&searchType=issue&pageNum=1`,
    });
  await expectSearchSpaSession(page);
});

test("project search renders legacy error/internalServerError_default.scala.html shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(
    `${basePath}/admin/sample/search?keyword=server-error&searchType=issue&pageNum=1`,
  );
  await expectProjectSearchErrorShell(page, {
    expectProjectHeader: false,
    expectProjectMenu: false,
    expectSiteBreadcrumb: false,
    expectedRootOrder: [
      "unsupported hidden",
      "gnb-outer project-header",
      "page-wrap-outer",
      "site-footer",
    ],
  });
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "Server error occurred; service is not available",
  );
  await expect(page.locator(".search-box-wrap")).toHaveCount(0);
  const homeButton = page.locator(".error-wrap .ybtn.ybtn-primary");
  await expect(homeButton).toHaveAttribute("href", `${basePath}/`);
  await markSearchSpaSession(page);
  await homeButton.click();
  await expectExactProjectSearchSpaPath(page, `${basePath}/`);
});

test("project search preserves whitespace-only keyword and calls scoped search API", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=%20%20&searchType=review`);
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();
  await expect(page.locator("#searchKeyword")).toHaveValue("  ");
  await expect(page.locator('[data-stylex-owner="project-search-category-item"][data-stylex-active="true"]')).toHaveText("Code Reviews 0");
  await expectProjectSearchCategoryAttributes(page, basePath, "  ");
  expect(searchApi.count).toBe(1);
  expect(searchApi.keywords).toEqual(["  "]);
});

test("project search category and form navigation stay inside the React SPA", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=missing&searchType=review`);
  await expect(page).toHaveURL(`${basePath}/admin/sample/search?keyword=missing&searchType=review`);
  await markSearchSpaSession(page);
  await page.locator("#searchKeyword").fill("fresh");
  await expectProjectSearchCategoryAttributes(page, basePath, "fresh");
  await expectProjectSearchCategoryActiveMarkers(page);
  const issueCategory = page.locator('[data-stylex-owner="project-search-category-list"] a', { hasText: "Issues" });
  await expect(issueCategory).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/search?keyword=fresh&searchType=issue`,
  );
  await issueCategory.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/search?keyword=fresh&searchType=issue`);
  await expect(page.locator('[data-stylex-owner="project-search-category-item"][data-stylex-active="true"]')).toHaveText("Issues 0");
  await expectProjectSearchCategoryActiveMarkers(page);
  await expectSearchSpaSession(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=missing&searchType=review`);
  await expect(page).toHaveURL(`${basePath}/admin/sample/search?keyword=missing&searchType=review`);
  await markSearchSpaSession(page);
  await page.locator("#searchKeyword").fill("typed");
  await page.locator("#searchInnerForm").evaluate((form) => {
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  });
  await expect(page).toHaveURL(`${basePath}/admin/sample/search?keyword=typed&searchType=review`);
  await expectSearchSpaSession(page);
});

test("org-owned project search exposes legacy project group search scope", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page, {
    ownerName: "weblabs",
    projectName: "portal",
    project: {
      isProtected: true,
      organizationName: "weblabs",
      ownerName: "weblabs",
      projectName: "portal",
    },
  });

  await page.goto(`${basePath}/weblabs/portal/search?keyword=missing&searchType=review`);

  await expect(page).toHaveURL(
    `${basePath}/weblabs/portal/search?keyword=missing&searchType=review`,
  );
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs`,
  );
  await expect(page.locator(".project-breadcrumb .project-author")).toHaveText("weblabs");
  await expect(page.locator(".project-breadcrumb .project-name a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal`,
  );
  await expect(page.locator(".project-breadcrumb .project-name")).toHaveText("portal");
  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-menu-outer .project-menu-nav li.active")).toHaveCount(0);
  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] form.gnb-search-form'),
  ).toHaveAttribute("action", `${basePath}/weblabs/portal/search`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const scopeButtons = page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button");
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(scopeButtons.locator("[data-toggle], [data-action]")).toHaveCount(0);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.filter({ hasText: "This Group" }).click();
  await expect(page).toHaveURL(
    `${basePath}/weblabs/portal/search?keyword=missing&searchType=review`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] form.gnb-search-form'),
  ).toHaveAttribute("action", `${basePath}/organizations/weblabs/search`);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.filter({ hasText: "All Projects" }).click();
  await expect(page).toHaveURL(
    `${basePath}/weblabs/portal/search?keyword=missing&searchType=review`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(
    page.locator('[data-stylex-owner="global-gnb-nav"] form.gnb-search-form'),
  ).toHaveAttribute("action", `${basePath}/search`);

  const layout = await page.evaluate(() => {
    const navbar = document.querySelector("[data-stylex-owner=global-gnb-outer]");
    const form = document.querySelector(".gnb-search-form");
    const scope = document.querySelector("#gnb-search-scope-title");
    const searchBox = document.querySelector('[data-stylex-owner="global-gnb-search-box"]');
    const searchInput = document.querySelector('[data-stylex-owner="global-gnb-search-input"]');
    const projectHeader = document.querySelector(".project-header-outer");
    const projectMenu = document.querySelector(".project-menu-outer");
    if (
      !navbar ||
      !form ||
      !scope ||
      !searchBox ||
      !searchInput ||
      !projectHeader ||
      !projectMenu
    ) {
      return null;
    }
    return {
      form: form.getBoundingClientRect(),
      navbar: navbar.getBoundingClientRect(),
      projectHeader: projectHeader.getBoundingClientRect(),
      projectMenu: projectMenu.getBoundingClientRect(),
      scope: scope.getBoundingClientRect(),
      searchBox: searchBox.getBoundingClientRect(),
      searchInput: searchInput.getBoundingClientRect(),
    };
  });
  expect(layout).not.toBeNull();
  expect(layout!.form.top).toBeGreaterThanOrEqual(layout!.navbar.top);
  expect(layout!.form.bottom).toBeLessThanOrEqual(layout!.navbar.bottom + 1);
  expect(layout!.scope.top).toBeGreaterThanOrEqual(layout!.navbar.top);
  expect(layout!.scope.bottom).toBeLessThanOrEqual(layout!.navbar.bottom + 1);
  expect(layout!.searchInput.top).toBeGreaterThanOrEqual(layout!.navbar.top);
  expect(layout!.searchInput.bottom).toBeLessThanOrEqual(layout!.navbar.bottom + 1);
  expect(layout!.scope.right).toBeLessThanOrEqual(layout!.searchBox.left + 1);
  expect(layout!.projectMenu.top).toBeGreaterThan(layout!.projectHeader.top);
});

async function expectProjectSearchShell(page: Page) {
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  await expect(page.locator('[data-stylex-owner="global-gnb-nav"]')).toContainText("List All");
  await expect(page.locator('[data-stylex-owner="global-gnb-nav"]')).toContainText("Feedback");
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const rootOrder = await page
    .locator(
      ".unsupported, [data-stylex-owner=global-gnb-outer], .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, [data-stylex-owner=site-footer]",
    )
    .evaluateAll((roots) =>
      roots.map((root) =>
        root.getAttribute("data-stylex-owner") === "site-footer" &&
        !root.classList.contains("page-footer-outer")
          ? "site-footer"
          : root.className,
      ),
    );
  expect(rootOrder).toEqual([
    "unsupported hidden",
    "gnb-outer project-header",
    "project-header-outer",
    "project-menu-outer",
    "site-breadcrumb-outer",
    "page-wrap-outer",
    "site-footer",
  ]);
  await expect(page.locator(".site-breadcrumb-inner h3")).toHaveText("Search");
}

async function expectProjectSearchForm(
  page: Page,
  basePath: string,
  searchType: string,
  keyword: string,
) {
  const form = page.locator("#searchInnerForm");
  await expect(form).toHaveAttribute("method", "get");
  await expect(form).toHaveAttribute("action", new RegExp(`${basePath}/admin/sample/search$`));
  await expect(form.locator("input[name='searchType']")).toHaveValue(searchType);
  await expect(form.locator("#searchKeyword[name='keyword'].span11")).toHaveValue(keyword);
  await expect(form.locator("button[type='submit'].ybtn")).toHaveText("Search");
}

async function expectProjectSearchCategoryAttributes(
  page: Page,
  basePath: string,
  keyword: string,
) {
  const categories = await page.locator('[data-stylex-owner="project-search-category-list"] li > a').evaluateAll((anchors) =>
    anchors.map((anchor) => {
      const badge = anchor.querySelector(".num-badge");
      const label = Array.from(anchor.childNodes)
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => child.textContent ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      return {
        count: badge?.textContent?.trim() ?? "",
        dataToggle: anchor.getAttribute("data-toggle"),
        dataType: anchor.getAttribute("data-type"),
        href: anchor.getAttribute("href"),
        label,
      };
    }),
  );

  expect(categories).toHaveLength(EXPECTED_PROJECT_SEARCH_CATEGORIES.length);
  expect(
    categories.map(({ label, dataToggle, dataType }) => ({ dataToggle, dataType, label })),
  ).toEqual(
    EXPECTED_PROJECT_SEARCH_CATEGORIES.map((category) => ({
      dataToggle: null,
      dataType: null,
      label: category.label,
    })),
  );
  expect(categories.map(({ count }) => count)).toEqual(
    categories.map(() => expect.stringMatching(/^\d+$/u)),
  );
  expect(categories.some(({ label }) => label === "Projects")).toBe(false);

  for (const [index, category] of categories.entries()) {
    expect(category.href).not.toBe("#");
    expect(category.href).not.toBeNull();
    const href = new URL(category.href!, "http://127.0.0.1");
    expect(`${href.pathname}`).toBe(`${basePath}/admin/sample/search`);
    expect(href.hash).toBe("");
    expect(href.searchParams.get("keyword")).toBe(keyword);
    expect(href.searchParams.get("searchType")).toBe(
      EXPECTED_PROJECT_SEARCH_CATEGORIES[index]?.type,
    );
  }
}

async function expectProjectSearchCategoryActiveMarkers(page: Page) {
  await expect(page.locator('[data-stylex-owner="project-search-category-list"] a[aria-current]')).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="project-search-category-list"] a[data-status]')).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="project-search-category-list"] li[data-stylex-active="true"]')).toHaveCount(1);

  expect(
    await page
      .locator('[data-stylex-owner="project-search-category-list"] li:not([data-stylex-active="true"]) > a')
      .evaluateAll((anchors) =>
        anchors.map((anchor) => ({
          hasStyleXClass: (anchor.getAttribute("class") ?? "").includes("x"),
          hasLegacyActiveClass: (anchor.getAttribute("class") ?? "").split(/\s+/u).includes("active"),
        })),
      ),
  ).toEqual(
    Array(EXPECTED_PROJECT_SEARCH_CATEGORIES.length - 1).fill({
      hasStyleXClass: true,
      hasLegacyActiveClass: false,
    }),
  );
}

async function mockProjectSearch(
  page: Page,
  options: {
    anonymousViewer?: boolean;
    localhostIssueCommentZeroResult?: boolean;
    ownerName?: string;
    project?: Record<string, unknown>;
    projectName?: string;
  } = {},
) {
  const anonymousViewer = options.anonymousViewer ?? false;
  const ownerName = options.ownerName ?? "admin";
  const projectName = options.projectName ?? "sample";
  const apiCalls: { count: number; keywords: string[]; pageNums: number[] } = {
    count: 0,
    keywords: [],
    pageNums: [],
  };

  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: anonymousViewer ? 0 : 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: anonymousViewer ? "" : "admin@example.com",
        isAnonymous: anonymousViewer,
        isConfirmed: !anonymousViewer,
        isSiteAdmin: !anonymousViewer,
        loginId: anonymousViewer ? "anonymous" : "admin",
        userLabel: anonymousViewer ? "Anonymous" : "Site Admin",
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(projectContainer({ ownerName, projectName, ...options.project })),
      });
    },
  );
  await page.route(`**/api/v1/projects/${ownerName}/${projectName}/search?**`, async (route) => {
    apiCalls.count += 1;
    const url = new URL(route.request().url());
    const keyword = url.searchParams.get("keyword") ?? "";
    const searchType = url.searchParams.get("searchType") ?? "review";
    const pageNum = Number(url.searchParams.get("pageNum")) || 1;
    apiCalls.keywords.push(keyword);
    apiCalls.pageNums.push(pageNum);
    if (keyword === "forbidden") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "forbidden",
            message: "You are not authorized",
            status: 403,
          },
        }),
      });
      return;
    }
    if (keyword === "server-error") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "internal_server_error",
            message: "Server error occurred; service is not available",
            status: 500,
          },
        }),
      });
      return;
    }
    const hasIssueResult = keyword === "sample" && searchType === "issue";
    const hasIssueCommentResult =
      keyword === "sample" &&
      searchType === "issue_comment" &&
      options.localhostIssueCommentZeroResult !== true;
    const hasPagedIssueResult = keyword === "paged" && searchType === "issue";
    const hasUserResult = keyword === "sample" && searchType === "user";
    const hasAnyResult =
      hasIssueResult || hasIssueCommentResult || hasPagedIssueResult || hasUserResult;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        context: {
          organizationName:
            typeof options.project?.organizationName === "string"
              ? options.project.organizationName
              : "",
          ownerName,
          projectName,
        },
        counts: {
          issueComments: hasIssueCommentResult ? 1 : 0,
          issues: hasIssueResult || hasPagedIssueResult ? 1 : 0,
          milestones: 0,
          postComments: 0,
          posts: 0,
          projects: 0,
          reviews: 0,
          users: hasUserResult ? 1 : 0,
        },
        items: hasUserResult
          ? [
              {
                authorLabel: "Dev Member",
                authorLoginId: "dev",
                avatarUrl: "/assets/images/default-avatar-32.png",
                createdLabel: "Jul 1, 2026",
                href: `${basePathFromRequest(route.request().url())}/dev`,
                id: "user-dev",
                ownerName,
                projectName,
                snippets: [],
                title: "Dev Member",
                type: "user",
                updatedLabel: "Jul 1, 2026",
              },
            ]
          : hasIssueResult || hasIssueCommentResult || hasPagedIssueResult
            ? [
                {
                  authorLabel: "Dev Member",
                  authorLoginId: "dev",
                  createdLabel: "Jul 1, 2026",
                  href: hasIssueCommentResult
                    ? `${basePathFromRequest(route.request().url())}/${ownerName}/${projectName}/issue/11#comment-77`
                    : `${basePathFromRequest(route.request().url())}/${ownerName}/${projectName}/issue/${
                        hasPagedIssueResult ? 40 + pageNum : 11
                      }`,
                  id: hasIssueCommentResult
                    ? "issue-comment-77"
                    : hasPagedIssueResult
                      ? `paged-${pageNum}`
                      : "issue-11",
                  number: hasIssueCommentResult
                    ? "11"
                    : hasPagedIssueResult
                      ? String(40 + pageNum)
                      : "11",
                  ownerName,
                  projectName,
                  snippets: [
                    {
                      highlights: [],
                      text: hasIssueCommentResult ? "Sample comment" : "Sample body",
                      truncated: !hasIssueCommentResult,
                    },
                  ],
                  state: "open",
                  title: hasPagedIssueResult ? `Paged issue ${pageNum}` : "Fix sample issue",
                  type: hasIssueCommentResult ? "issue_comment" : "issue",
                  updatedLabel: "Jul 1, 2026",
                },
              ]
            : [],
        keyword,
        pageNum,
        pageSize: 20,
        requestedSearchType: searchType,
        scope: "project",
        searchType,
        totalCount: hasAnyResult ? 1 : 0,
        totalPages: hasPagedIssueResult ? 3 : 1,
      }),
    });
  });

  return apiCalls;
}

function basePathFromRequest(requestUrl: string) {
  const url = new URL(requestUrl);
  const apiPathStart = url.pathname.indexOf("/api/v1/");
  return apiPathStart > 0 ? url.pathname.slice(0, apiPathStart) : "";
}

function projectContainer(overrides: Record<string, unknown> = {}) {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
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
    ...overrides,
  };
}

function expectedProjectSearchShellScreen(basePath: string) {
  return expectedProjectSearchShellHtml(basePath, EXPECTED_PROJECT_SEARCH);
}

function expectedProjectIssueSearchScreen(basePath: string) {
  return expectedProjectSearchShellHtml(basePath, EXPECTED_PROJECT_ISSUE_SEARCH);
}

function expectedProjectSearchShellHtml(basePath: string, html: string) {
  return html
    .replaceAll("__BASE_PATH__", basePath)
    .replace('<header class="gnb-outer">', '<header class="gnb-outer project-header">')
    .replace(
      `<ul class="gnb-nav">
      <li><a href="${basePath}" class="logo logo-letter">Y</a></li>
      <li><form action="${basePath}/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>`,
      `<ul class="gnb-nav">
      <li><a href="${basePath}" class="logo logo-letter">Y</a></li>
      <li><a href="${basePath}/projects" class="show-progress-bar">List All</a></li><li class="divider"></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
      <li><form action="${basePath}/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Project</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope" data-action="${basePath}/admin/sample/search">This Project</button></li><li><button type="button" data-toggle="search-scope" data-action="${basePath}/search">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>`,
    );
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-stylex-owner=global-gnb-outer], .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, [data-stylex-owner=site-footer]",
      ),
    );
    return roots.map((root) => visit(root)).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !isModernizedTanStackRouterAttr(attr) &&
            !isEmptyModernizedTanStackRouterActiveClass(attr) &&
            !isModernizedLegacySearchCategoryAttribute(attr) &&
            !isModernizedLegacySearchCategoryButtonType(attr) &&
            !isModernizedLegacyTabButtonType(attr) &&
            !isModernizedLegacyDropdownButtonType(attr) &&
            !isModernizedLegacyPinButtonType(attr) &&
            !isModernizedSiteAdminTooltipAttr(attr) &&
            !isLegacyPluginAttribute(attr) &&
            attr.name !== "data-login" &&
            attr.name !== "aria-controls" &&
            attr.name !== "aria-expanded" &&
            attr.name !== "aria-hidden" &&
            attr.name !== "role" &&
            attr.name !== "tabindex" &&
            attr.name !== "alt",
        )
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .concat(isModernizedLegacySearchCategoryButton(node) ? [`href=${JSON.stringify("#")}`] : [])
        .concat(
          isModernizedLegacyTabButton(node) ? [`href=${JSON.stringify(legacyTabHref(node))}`] : [],
        )
        .concat(
          isModernizedLegacyDropdownButton(node)
            ? [`href=${JSON.stringify("javascript:void(0);")}`]
            : [],
        )
        .sort()
        .join(" ");
      const tagName =
        isModernizedLegacySearchCategoryButton(node) ||
        isModernizedLegacyTabButton(node) ||
        isModernizedLegacyDropdownButton(node)
          ? "a"
          : isModernizedLegacyPinButton(node)
            ? "div"
            : node.tagName.toLowerCase();
      const open = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${tagName}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr): string {
      if (
        attr.name === "class" &&
        (attr.ownerElement?.matches('[data-stylex-owner="global-gnb-inner"]') ||
          attr.ownerElement?.matches('[data-stylex-owner="global-gnb-outer"]') ||
          attr.ownerElement?.matches('[data-stylex-owner="site-footer"]') ||
          attr.ownerElement?.matches('[data-stylex-owner="site-footer-inner"]') ||
          attr.ownerElement?.matches('[data-stylex-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      if (
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("gnb-nav") &&
        attr.ownerElement.matches('[data-stylex-owner="global-gnb-nav"]')
      ) {
        const originalValue = attr.value;
        attr.value = originalValue
          .split(/\s+/u)
          .filter((token) => token !== "gnb-nav")
          .join(" ");
        try {
          return normalizeAttr(attr);
        } finally {
          attr.value = originalValue;
        }
      }
      if (isModernizedTanStackRouterHref(attr)) {
        return "#";
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
      }
      if (attr.name === "src" && attr.value.includes("/assets/")) {
        return attr.value.slice(attr.value.indexOf("/assets/"));
      }
      if (
        attr.name === "href" &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("logo-letter") &&
        attr.value.length > 1
      ) {
        return attr.value.replace(/\/$/u, "");
      }
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }

    function isModernizedLegacySearchCategoryAttribute(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-type") &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest('[data-stylex-owner="project-search-category-list"]') !== null
      );
    }

    function isModernizedTanStackRouterHref(attr: Attr) {
      return (
        attr.name === "href" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest('[data-stylex-owner="project-search-category-list"]') !== null
      );
    }

    function isModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        attr.name === "class" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest('[data-stylex-owner="project-search-category-list"]') !== null
      );
    }

    function isModernizedLegacySearchCategoryButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacySearchCategoryButton(attr.ownerElement);
    }

    function isModernizedLegacyTabButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyTabButton(attr.ownerElement);
    }

    function isModernizedLegacyDropdownButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyDropdownButton(attr.ownerElement);
    }

    function isModernizedLegacyPinButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyPinButton(attr.ownerElement);
    }

    function isLegacyPluginAttribute(attr: Attr) {
      return ["data-action", "data-placement", "data-toggle"].includes(attr.name);
    }

    function isModernizedSiteAdminTooltipAttr(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-placement" || attr.name === "title") &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("usermenu-icon-button")
      );
    }

    function isModernizedLegacySearchCategoryButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.closest('[data-stylex-owner="project-search-category-list"]') !== null
      );
    }

    function isModernizedLegacySearchCategoryControl(node: Element | null) {
      return node instanceof HTMLAnchorElement || isModernizedLegacySearchCategoryButton(node);
    }

    function isModernizedLegacyTabButton(node: Element | null) {
      return node instanceof HTMLButtonElement && node.closest(".nav-tabs.nm") !== null;
    }

    function isModernizedLegacyPinButton(node: Element | null) {
      return node instanceof HTMLButtonElement && node.classList.contains("pin");
    }

    function legacyTabHref(node: Element) {
      const item = node.closest("li");
      if (item?.classList.contains("myOrganizationList")) {
        return "#myOrganizationList";
      }
      if (item?.classList.contains("myProjectList")) {
        return "#myProjectList";
      }
      return "#myRecentIssueList";
    }

    function isModernizedLegacyDropdownButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.classList.contains("gnb-dropdown-toggle") &&
        node.closest(".gnb-usermenu") !== null
      );
    }

    function isEmptyModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        isModernizedTanStackRouterActiveClass(attr) &&
        modernizedTanStackRouterActiveClass(attr) === ""
      );
    }

    function modernizedTanStackRouterActiveClass(attr: Attr) {
      return attr.value
        .split(/\s+/u)
        .filter((token) => token && token !== "active")
        .join(" ");
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
        .filter(
          (attr) =>
            !isModernizedTanStackRouterAttr(attr) &&
            !isEmptyModernizedTanStackRouterActiveClass(attr) &&
            !isModernizedLegacySearchCategoryAttribute(attr) &&
            !isModernizedLegacySearchCategoryButtonType(attr) &&
            !isModernizedLegacyTabButtonType(attr) &&
            !isModernizedLegacyDropdownButtonType(attr) &&
            !isModernizedLegacyPinButtonType(attr) &&
            !isModernizedSiteAdminTooltipAttr(attr) &&
            !isLegacyPluginAttribute(attr) &&
            attr.name !== "data-login" &&
            attr.name !== "aria-controls" &&
            attr.name !== "aria-expanded" &&
            attr.name !== "aria-hidden" &&
            attr.name !== "role" &&
            attr.name !== "tabindex" &&
            attr.name !== "alt",
        )
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .concat(isModernizedLegacySearchCategoryButton(node) ? [`href=${JSON.stringify("#")}`] : [])
        .concat(
          isModernizedLegacyTabButton(node) ? [`href=${JSON.stringify(legacyTabHref(node))}`] : [],
        )
        .concat(
          isModernizedLegacyDropdownButton(node)
            ? [`href=${JSON.stringify("javascript:void(0);")}`]
            : [],
        )
        .sort()
        .join(" ");
      const tagName =
        isModernizedLegacySearchCategoryButton(node) ||
        isModernizedLegacyTabButton(node) ||
        isModernizedLegacyDropdownButton(node)
          ? "a"
          : isModernizedLegacyPinButton(node)
            ? "div"
            : node.tagName.toLowerCase();
      const open = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${tagName}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr): string {
      const isSiteLayoutHeader =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("gnb-outer") &&
        attr.ownerElement.matches("header.gnb-outer") &&
        attr.ownerElement.querySelector(':scope > div.gnb-inner form[name="gnb-search-form"]') !==
          null;
      const isSiteLayoutFooterOuter =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("page-footer-outer") &&
        attr.ownerElement.matches("footer.page-footer-outer") &&
        attr.ownerElement.querySelector(":scope > div.page-footer > span.provider") !== null;
      const isSiteLayoutFooterInner =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("page-footer") &&
        attr.ownerElement.matches("footer.page-footer-outer > div.page-footer") &&
        attr.ownerElement.querySelector(":scope > span.provider") !== null;
      const isSiteLayoutFooterProvider =
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("provider") &&
        attr.ownerElement.matches("footer.page-footer-outer > div.page-footer > span.provider");
      const retiredToken = isSiteLayoutFooterOuter
        ? "page-footer-outer"
        : isSiteLayoutFooterInner
          ? "page-footer"
          : isSiteLayoutFooterProvider
            ? "provider"
            : isSiteLayoutHeader && attr.value.split(/\s+/u).includes("project-header")
              ? "project-header"
              : isSiteLayoutHeader
                ? "gnb-outer"
                : attr.name === "class" &&
                    attr.ownerElement &&
                    attr.value.split(/\s+/u).includes("gnb-inner") &&
                    attr.ownerElement.matches("header.gnb-outer > div.gnb-inner") &&
                    attr.ownerElement.querySelector('form[name="gnb-search-form"]') !== null
                  ? "gnb-inner"
                  : attr.name === "class" &&
                      attr.ownerElement &&
                      attr.value.split(/\s+/u).includes("gnb-nav") &&
                      attr.ownerElement.matches("header.gnb-outer > .gnb-inner > ul.gnb-nav") &&
                      attr.ownerElement.querySelector('form[name="gnb-search-form"]') !== null
                    ? "gnb-nav"
                    : null;
      if (retiredToken) {
        const originalValue = attr.value;
        attr.value = originalValue
          .split(/\s+/u)
          .filter((token) => token !== retiredToken)
          .join(" ");
        try {
          return normalizeAttr(attr);
        } finally {
          attr.value = originalValue;
        }
      }
      if (isModernizedTanStackRouterHref(attr)) {
        return "#";
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
      }
      if (attr.name === "src" && attr.value.includes("/assets/")) {
        return attr.value.slice(attr.value.indexOf("/assets/"));
      }
      if (
        attr.name === "href" &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("logo-letter") &&
        attr.value.length > 1
      ) {
        return attr.value.replace(/\/$/u, "");
      }
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }

    function isModernizedLegacySearchCategoryAttribute(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-type") &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest('[data-stylex-owner="project-search-category-list"]') !== null
      );
    }

    function isModernizedTanStackRouterHref(attr: Attr) {
      return (
        attr.name === "href" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest('[data-stylex-owner="project-search-category-list"]') !== null
      );
    }

    function isModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        attr.name === "class" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest('[data-stylex-owner="project-search-category-list"]') !== null
      );
    }

    function isModernizedLegacySearchCategoryButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacySearchCategoryButton(attr.ownerElement);
    }

    function isModernizedLegacyTabButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyTabButton(attr.ownerElement);
    }

    function isModernizedLegacyDropdownButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyDropdownButton(attr.ownerElement);
    }

    function isModernizedLegacyPinButtonType(attr: Attr) {
      return attr.name === "type" && isModernizedLegacyPinButton(attr.ownerElement);
    }

    function isLegacyPluginAttribute(attr: Attr) {
      return ["data-action", "data-placement", "data-toggle"].includes(attr.name);
    }

    function isModernizedSiteAdminTooltipAttr(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-placement" || attr.name === "title") &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("usermenu-icon-button")
      );
    }

    function isModernizedLegacySearchCategoryButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.closest('[data-stylex-owner="project-search-category-list"]') !== null
      );
    }

    function isModernizedLegacySearchCategoryControl(node: Element | null) {
      return node instanceof HTMLAnchorElement || isModernizedLegacySearchCategoryButton(node);
    }

    function isModernizedLegacyTabButton(node: Element | null) {
      return node instanceof HTMLButtonElement && node.closest(".nav-tabs.nm") !== null;
    }

    function isModernizedLegacyPinButton(node: Element | null) {
      return node instanceof HTMLButtonElement && node.classList.contains("pin");
    }

    function legacyTabHref(node: Element) {
      const item = node.closest("li");
      if (item?.classList.contains("myOrganizationList")) {
        return "#myOrganizationList";
      }
      if (item?.classList.contains("myProjectList")) {
        return "#myProjectList";
      }
      return "#myRecentIssueList";
    }

    function isModernizedLegacyDropdownButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.classList.contains("gnb-dropdown-toggle") &&
        node.closest(".gnb-usermenu") !== null
      );
    }

    function isEmptyModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        isModernizedTanStackRouterActiveClass(attr) &&
        modernizedTanStackRouterActiveClass(attr) === ""
      );
    }

    function modernizedTanStackRouterActiveClass(attr: Attr) {
      return attr.value
        .split(/\s+/u)
        .filter((token) => token && token !== "active")
        .join(" ");
    }
  }, html);
}

async function markSearchSpaSession(page: Page) {
  await page.evaluate(() => {
    window.sessionStorage.setItem("project-search-spa-marker", "alive");
  });
}

async function expectSearchSpaSession(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.sessionStorage.getItem("project-search-spa-marker")))
    .toBe("alive");
}

async function expectExactProjectSearchSpaPath(page: Page, expectedPath: string) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(expectedPath);
  await expectSearchSpaSession(page);
}

async function expectProjectSearchErrorShell(
  page: Page,
  options: {
    expectProjectHeader: boolean;
    expectProjectMenu: boolean;
    expectSiteBreadcrumb: boolean;
    expectedRootOrder: string[];
  },
) {
  await expect(page.locator(".project-header-outer")).toHaveCount(
    options.expectProjectHeader ? 1 : 0,
  );
  await expect(page.locator(".project-menu-outer")).toHaveCount(options.expectProjectMenu ? 1 : 0);
  await expect(page.locator(".site-breadcrumb-outer")).toHaveCount(
    options.expectSiteBreadcrumb ? 1 : 0,
  );
  expect(
    await page
      .locator(
        ".unsupported, [data-stylex-owner=global-gnb-outer], .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, [data-stylex-owner=site-footer]",
      )
      .evaluateAll((roots) =>
        roots.map((root) =>
          root.getAttribute("data-stylex-owner") === "site-footer" &&
          !root.classList.contains("page-footer-outer")
            ? "site-footer"
            : root.className,
        ),
      ),
  ).toEqual(options.expectedRootOrder);
}
