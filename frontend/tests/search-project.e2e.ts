import { expect, test, type Page } from "@playwright/test";

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
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-page-wrap"><div class="row-fluid"><div class="span2"><ul class="lst-stacked unstyled search-category-wrap"><li class="active "><a href="#" data-toggle="search-category" data-type="issue">Issues<span class="num-badge pull-right">1</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="user">Users<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post">Posts<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="milestone">Milestones<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="issue_comment">Issue Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="post_comment">Post Comments<span class="num-badge pull-right">0</span></a></li><li class=" empty"><a href="#" data-toggle="search-category" data-type="review">Code Reviews<span class="num-badge pull-right">0</span></a></li></ul></div><div class="span10"><div class="search-box-wrap"><form id="searchInnerForm" method="get" action="__BASE_PATH__/admin/sample/search"><input type="hidden" name="searchType" value="issue"><input type="text" id="searchKeyword" name="keyword" class="span11" value="sample"><button type="submit" class="ybtn">Search</button></form><h3 class="search-result-title">Found <strong>1</strong> result(s) in Issues</h3></div><div class="search-result-wrap"><ul class="search-list-wrap"><li class="search-list-item"><div class="title-wrap"><span class="post-id">#11</span><a href="__BASE_PATH__/admin/sample/issue/11" class="title">Fix <strong class="keyword">sample</strong> issue</a></div><div class="search-content"><p class="search-content-body"><strong class="keyword">Sample</strong>body.....</p></div><div class="search-meta-info"><a href="__BASE_PATH__/dev" class="meta-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="meta-item" title="Jul 1, 2026">Jul 1, 2026</span></div></li></ul><div id="pagination"></div></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project search matches legacy search/result.scala.html project empty review DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=missing&searchType=review`);
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();
  expect(
    await page
      .locator(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      )
      .evaluateAll((roots) => roots.map((root) => root.className)),
  ).toEqual([
    "unsupported hidden",
    "gnb-outer",
    "project-header-outer",
    "project-menu-outer",
    "site-breadcrumb-outer",
    "page-wrap-outer",
    "page-footer-outer",
  ]);
  await expectProjectSearchShell(page);
  await expectProjectSearchForm(page, basePath, "review", "missing");
  await expect(page.locator(".project-menu-outer .project-menu-nav li.active")).toHaveCount(0);
  await expect(page.locator(".search-category-wrap li")).toHaveCount(7);
  await expect(page.locator(".search-category-wrap")).not.toContainText("Projects");
  await expect(page.locator(".search-result-wrap").locator("> .empty-result")).toHaveCount(1);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROJECT_SEARCH.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project issue search renders legacy partial_issues.scala.html scoped result row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=sample&searchType=issue`);

  await expectProjectSearchShell(page);
  await expectProjectSearchForm(page, basePath, "issue", "sample");
  await expect(page.locator(".search-category-wrap li")).toHaveCount(7);
  await expect(page.locator(".search-category-wrap")).not.toContainText("Projects");
  await expect(page.locator(".search-category-wrap li.active")).toHaveText("Issues1");
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
  await expect(author).toHaveAttribute("data-toggle", "tooltip");
  await expect(author).toHaveAttribute("data-placement", "top");
  await expect(author).toHaveAttribute("title", "dev");
  await expect(author).toHaveText("Dev Member");
  await expect(row.locator(".search-meta-info span.meta-item")).toHaveAttribute(
    "title",
    "Jul 1, 2026",
  );
  await expect(page.locator(".search-result-wrap #pagination")).toBeEmpty();

  const layout = await page.evaluate(() => {
    const row = document.querySelector(".row-fluid");
    const category = document.querySelector(".search-category-wrap");
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
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_ISSUE_SEARCH.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project issue comment search renders legacy partial_issue_comments.scala.html scoped result row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=sample&searchType=issue_comment`);

  await expectProjectSearchShell(page);
  await expectProjectSearchForm(page, basePath, "issue_comment", "sample");
  await expect(page.locator(".search-category-wrap li")).toHaveCount(7);
  await expect(page.locator(".search-category-wrap")).not.toContainText("Projects");
  await expect(page.locator(".search-category-wrap li.active")).toHaveText("Issue Comments1");
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
  await expect(author).toHaveAttribute("data-toggle", "tooltip");
  await expect(author).toHaveAttribute("data-placement", "top");
  await expect(author).toHaveAttribute("title", "dev");
  await expect(author).toHaveText("Dev Member");
  await expect(row.locator(".search-meta-info span.meta-item")).toHaveAttribute(
    "title",
    "Jul 1, 2026",
  );
  await expect(row.locator(".search-meta-info span.meta-item")).toHaveText("Jul 1, 2026");
  await expect(page.locator(".search-result-wrap #pagination")).toBeEmpty();
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
  await expect(homeButton).toHaveAttribute("href", basePath);
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
  await expectExactProjectSearchSpaPath(page, basePath);
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
      "gnb-outer",
      "project-header-outer",
      "project-menu-outer",
      "page-wrap-outer",
      "page-footer-outer",
    ],
  });
  await expect(page.locator(".project-menu-outer .project-menu-gruop > li.active")).toHaveCount(1);
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
    expectedRootOrder: ["unsupported hidden", "gnb-outer", "page-wrap-outer", "page-footer-outer"],
  });
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "Server error occurred; service is not available",
  );
  await expect(page.locator(".search-box-wrap")).toHaveCount(0);
  const homeButton = page.locator(".error-wrap .ybtn.ybtn-primary");
  await expect(homeButton).toHaveAttribute("href", basePath);
  await markSearchSpaSession(page);
  await homeButton.click();
  await expectExactProjectSearchSpaPath(page, basePath);
});

test("project search preserves whitespace-only keyword and calls scoped search API", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const searchApi = await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=%20%20&searchType=review`);
  await expect(page.locator(".search-result-wrap .empty-result")).toBeVisible();
  await expect(page.locator("#searchKeyword")).toHaveValue("  ");
  await expect(page.locator(".search-category-wrap li.active button")).toHaveText("Code Reviews0");
  expect(searchApi.count).toBe(1);
  expect(searchApi.keywords).toEqual(["  "]);
});

test("project search category and form navigation stay inside the React SPA", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSearch(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=missing&searchType=review`);
  await markSearchSpaSession(page);
  await page.locator("#searchKeyword").fill("fresh");
  await expect(page.locator('.search-category-wrap a[href="#"]')).toHaveCount(0);
  await expect(page.locator(".search-category-wrap a")).toHaveCount(0);
  const issueCategory = page.locator(".search-category-wrap button", { hasText: "Issues" });
  await expect(issueCategory).toHaveAttribute("type", "button");
  await issueCategory.click();
  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/search\\?`));
  expect(new URL(page.url()).searchParams.get("keyword")).toBe("fresh");
  expect(new URL(page.url()).searchParams.get("searchType")).toBe("issue");
  await expect(page.locator(".search-category-wrap li.active button")).toHaveText("Issues0");
  await expectSearchSpaSession(page);

  await page.goto(`${basePath}/admin/sample/search?keyword=missing&searchType=review`);
  await markSearchSpaSession(page);
  await page.locator("#searchKeyword").fill("typed");
  await page.locator("#searchInnerForm").evaluate((form) => {
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  });
  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/search\\?`));
  expect(new URL(page.url()).searchParams.get("keyword")).toBe("typed");
  expect(new URL(page.url()).searchParams.get("searchType")).toBe("review");
  await expectSearchSpaSession(page);
});

async function expectProjectSearchShell(page: Page) {
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer")).toBeVisible();
  const rootOrder = await page
    .locator(".project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer")
    .evaluateAll((roots) => roots.map((root) => root.className));
  expect(rootOrder).toEqual([
    "project-header-outer",
    "project-menu-outer",
    "site-breadcrumb-outer",
    "page-wrap-outer",
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

async function mockProjectSearch(
  page: Page,
  options: {
    anonymousViewer?: boolean;
  } = {},
) {
  const anonymousViewer = options.anonymousViewer ?? false;
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectContainer()),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/search?**", async (route) => {
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
    const hasIssueCommentResult = keyword === "sample" && searchType === "issue_comment";
    const hasPagedIssueResult = keyword === "paged" && searchType === "issue";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        context: {
          organizationName: "",
          ownerName: "admin",
          projectName: "sample",
        },
        counts: {
          issueComments: hasIssueCommentResult ? 1 : 0,
          issues: hasIssueResult || hasPagedIssueResult ? 1 : 0,
          milestones: 0,
          postComments: 0,
          posts: 0,
          projects: 0,
          reviews: 0,
          users: 0,
        },
        items:
          hasIssueResult || hasIssueCommentResult || hasPagedIssueResult
            ? [
                {
                  authorLabel: "Dev Member",
                  authorLoginId: "dev",
                  createdLabel: "Jul 1, 2026",
                  href: hasIssueCommentResult
                    ? `${basePathFromRequest(route.request().url())}/admin/sample/issue/11#comment-77`
                    : `${basePathFromRequest(route.request().url())}/admin/sample/issue/${
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
                  ownerName: "admin",
                  projectName: "sample",
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
        totalCount: hasIssueResult || hasIssueCommentResult || hasPagedIssueResult ? 1 : 0,
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

function projectContainer() {
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
  };
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
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
            !isModernizedSiteAdminTooltipAttr(attr) &&
            attr.name !== "data-login" &&
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
          : node.tagName.toLowerCase();
      const open = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${tagName}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (isModernizedTanStackRouterHref(attr)) {
        return "#";
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
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
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedTanStackRouterHref(attr: Attr) {
      return (
        attr.name === "href" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        attr.name === "class" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
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

    function isModernizedSiteAdminTooltipAttr(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-placement" || attr.name === "title") &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("usermenu-icon-button")
      );
    }

    function isModernizedLegacySearchCategoryButton(node: Element | null) {
      return node instanceof HTMLButtonElement && node.closest(".search-category-wrap") !== null;
    }

    function isModernizedLegacySearchCategoryControl(node: Element | null) {
      return node instanceof HTMLAnchorElement || isModernizedLegacySearchCategoryButton(node);
    }

    function isModernizedLegacyTabButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.closest(".nav-tabs.nm") !== null &&
        node.getAttribute("data-toggle") === "tab"
      );
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
            !isModernizedSiteAdminTooltipAttr(attr) &&
            attr.name !== "data-login" &&
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
          : node.tagName.toLowerCase();
      const open = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${tagName}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      if (isModernizedTanStackRouterHref(attr)) {
        return "#";
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
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
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedTanStackRouterHref(attr: Attr) {
      return (
        attr.name === "href" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
      );
    }

    function isModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        attr.name === "class" &&
        isModernizedLegacySearchCategoryControl(attr.ownerElement) &&
        attr.ownerElement.closest(".search-category-wrap") !== null
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

    function isModernizedSiteAdminTooltipAttr(attr: Attr) {
      return (
        (attr.name === "data-toggle" || attr.name === "data-placement" || attr.name === "title") &&
        attr.ownerElement instanceof Element &&
        attr.ownerElement.classList.contains("usermenu-icon-button")
      );
    }

    function isModernizedLegacySearchCategoryButton(node: Element | null) {
      return node instanceof HTMLButtonElement && node.closest(".search-category-wrap") !== null;
    }

    function isModernizedLegacySearchCategoryControl(node: Element | null) {
      return node instanceof HTMLAnchorElement || isModernizedLegacySearchCategoryButton(node);
    }

    function isModernizedLegacyTabButton(node: Element | null) {
      return (
        node instanceof HTMLButtonElement &&
        node.closest(".nav-tabs.nm") !== null &&
        node.getAttribute("data-toggle") === "tab"
      );
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
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .site-breadcrumb-outer, .page-wrap-outer, .page-footer-outer",
      )
      .evaluateAll((roots) => roots.map((root) => root.className)),
  ).toEqual(options.expectedRootOrder);
}
