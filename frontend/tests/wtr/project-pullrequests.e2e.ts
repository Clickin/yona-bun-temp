import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const PROJECT_PULLREQUESTS_ROUTE_SOURCE = readFileSync(
  "src/routes/$ownerName/$projectName/pullRequests.tsx",
  "utf8",
);
const PROJECT_CLOSED_PULLREQUESTS_ROUTE_SOURCE = readFileSync(
  "src/routes/$ownerName/$projectName/closedPullRequests.tsx",
  "utf8",
);
const PROJECT_SENT_PULLREQUESTS_ROUTE_SOURCE = readFileSync(
  "src/routes/$ownerName/$projectName/sentPullRequests.tsx",
  "utf8",
);

const EXPECTED_PROJECT_PULLREQUESTS_EMPTY = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><button aria-controls="sidebar" aria-expanded="false" class="pin" title="Sidebar" type="button"><i aria-hidden="true" class="yobicon-arrow-left"></i><i aria-hidden="true" class="yobicon-arrow-right"></i></button><ul class="gnb-nav"><li class=""><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li class=""><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li><li class="divider"></li><li class=""><a class="" href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li><li class=""><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input accesskey="S" autocomplete="off" class="" name="keyword" type="text"><button class="" type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content"><div class="tab-pane user-project-list active" id="myOrganizationList"><div class="search-result"><div class="group"><input autocomplete="off" class="search-input org-search" placeholder="Type name" type="text" value=""></input><span class="bar"></span></div><div class="no-result tab-pane user-ul" id="organizations">No results</div></div></div><div class="tab-pane user-project-list" id="myProjectList"><div><div class="search-result"><div class="tab-pane myproject-list-wrap"><div class="group"><input autocomplete="off" class="search-input project-search" id="query" placeholder="Type name" type="text" value=""></input><span class="bar"></span></div><div class="subtab-wrap subtab-group"><ul class="nav-subtab unstyled"><li class="active"><button class="" type="button">Recently visited</button></li><li class=""><button class="" type="button">Create</button></li><li class=""><button class="" type="button">Watching</button></li><li class=""><button class="" type="button">Member</button></li></ul></div><div class="tab-content"><div class="no-result tab-pane user-ul active" id="recentlyVisited">No results</div><div class="no-result tab-pane user-ul" id="watching">No results</div><div class="no-result tab-pane user-ul" id="createdByMe">No results</div><div class="no-result tab-pane user-ul" id="joinmember">No results</div></div></div></div></div></div><div class="tab-pane user-project-list" id="myRecentIssueList"><div><div class="search-result"><div class="tab-pane myproject-list-wrap"><div class="group"><input autocomplete="off" class="search-input project-search" id="recent-issue-query" placeholder="Type name" type="text" value=""></input><span class="bar"></span></div><div class="tab-content"><div class="no-result tab-pane user-ul active" id="recentlyVisitedIssues">No results</div></div></div></div></div></div></div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" title="Shortcut (A)"><a class="user-item-btn loggged-in" href="__BASE_PATH__/user/issues">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a class="usermenu-icon-button show-progress-bar" href="__BASE_PATH__/sites/userList" title="Site administration"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button aria-controls="mySidenav" aria-expanded="false" class="gnb-dropdown-toggle" title="User menu, Shortcut (F)" type="button"><span class="avatar-wrap smaller"><img src="__BASE_PATH__/assets/images/default-avatar-32.png"></img></span><span class="caret"></span></button></li><li class="gnb-usermenu-dropdown"><button class="gnb-dropdown-toggle dropdwon-box-btn" type="button"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></hr></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img class="" src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a class="" href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a class="" href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a class="" href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a class="" href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a class="" href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class="active"><a class="" href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a class="" href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a class="" href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a class="" href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a class="" href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li><li></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="row-fluid cb"><div class="left-menu search-wrap hide-in-mobile"><form action="__BASE_PATH__/admin/sample/pullRequests" id="search" method="get" name="search"><div class="search"><div class="search-bar"><input class="" name="filter" type="text" value="empty"></input><button class="search-btn" type="submit"><i class="yobicon-search"></i></button></div></div><div id="advanced-search-form" class="srch-advanced"><dl class="issue-option"><dt>Sender</dt><dd><select class="" data-format="user" id="contributors" name="contributorId"><option value="" selected="">All</option><option value="1">Sent by me</option><option value="1">Site Admin</option><option value="2">Dev Member</option></select></dd></dl></div></form></div><div class="span10 span-hard-wrap" id="span10"><div class="pull-right"><a class="ybtn ybtn-success" href="__BASE_PATH__/admin/sample/newPullRequestForm">pull request</a></div><ul class="nav nav-tabs nm pullrequeset-tab-menu"><li class="active"><a href="#" data-url="__BASE_PATH__/admin/sample/pullRequests" data-type="state">Open<span class="num-badge">0</span></a></li><li class=""><a href="#" data-url="__BASE_PATH__/admin/sample/closedPullRequests" data-type="state">Closed<span class="num-badge">0</span></a></li><li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li></ul><div class=""><div id="list" class="row-fluid tab-pane active"><ul class="post-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No pull requests have been received</p></div></ul></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

function expectedProjectPullRequestsEmpty(basePath: string) {
  return withProjectSearchScopeHeader(
    EXPECTED_PROJECT_PULLREQUESTS_EMPTY.replaceAll("__BASE_PATH__", basePath)
      .replace(
        '<li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>',
        '<li class="myOrganizationList active"><button class="" type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button class="" type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button class="" type="button" data-toggle="tab">Recent History</button></li>',
      )
      .replace(
        '<a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)">',
        '<button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)">',
      )
      .replace(
        '</a></li><li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown">',
        '</button></li><li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown">',
      )
      .replace(
        '</a><ul class="dropdown-menu flat right">',
        '</button><ul class="dropdown-menu flat right">',
      )
      .replace(
        '<span class="user-project-list" data-project-id="7">',
        '<span class="user-project-list" data-project-id="7" role="button" tabindex="0">',
      ),
    basePath,
  );
}

test("project pull request empty list matches legacy git/list.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=empty`);
  await expect(page).toHaveTitle("sample - Pull request - admin/sample");
  expect(
    await page
      .locator("head > title")
      .first()
      .evaluate((title) => title.textContent),
  ).toBe("sample - Pull request - admin/sample");
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator("[pjax-container]")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator(".error-wrap")).toHaveText("No pull requests have been received");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap #pagination")).toHaveCount(0);
  await expectLegacyPlainListLink(page.locator(".pull-right > a.ybtn-success"));
  await expectLegacyPlainListLink(
    page.locator(".pullrequeset-tab-menu a").filter({ hasText: "Open" }),
  );
  await expectLegacyPlainListLink(
    page.locator(".pullrequeset-tab-menu a").filter({ hasText: "Closed" }),
  );

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedProjectPullRequestsEmpty(basePath)),
  );
});

test("project pull request recently pushed branch prompt matches legacy partial DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { pushedBranchDeleteRequests } = await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=pushed`);
  await expect(page.locator("#span10 > h5")).toHaveText("Recently pushed branch");
  await expect(page.locator(".alert.alert-info .yobicon-split")).toHaveCount(1);
  await expect(page.locator(".alert.alert-info a").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  await expect(page.locator(".alert.alert-info a").first()).toHaveText("Pull request");
  await expectLegacyPlainListLink(page.locator(".alert.alert-info a").first());
  await expect(page.locator('.alert.alert-info a.close[href="#"]')).toHaveCount(0);
  const closeControl = page.locator(".alert.alert-info button.close");
  await expect(closeControl).toHaveAttribute("type", "button");
  await expect(closeControl).toHaveAttribute("class", "close");
  await expect(closeControl).not.toHaveAttribute("data-dismiss");
  await expect(closeControl).toHaveAttribute("aria-hidden", "true");
  expect(await closeControl.getAttribute("data-request-method")).toBeNull();
  expect(await closeControl.getAttribute("data-request-uri")).toBeNull();
  await expect(page.locator(".alert.alert-info [data-request-method]")).toHaveCount(0);
  await expect(page.locator(".alert.alert-info [data-request-uri]")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedRecentlyPushedPullRequests(basePath)),
  );

  await markPullRequestSpaSession(page);
  await closeControl.click();
  await expect
    .poll(() => pushedBranchDeleteRequests)
    .toEqual([
      {
        hasCsrfToken: true,
        method: "DELETE",
        url: `${basePath}/api/v1/owners/admin/projects/sample/pushed-branches/17`,
      },
    ]);
  await expect(page.locator(".alert.alert-info")).toHaveCount(0);
  await expect(page.locator("#span10 > h5")).toHaveCount(0);
  await expectPullRequestSpaSession(page);
});

test("project pull request create links use SPA navigation with legacy hrefs", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=empty`);
  const newPullRequestLink = page.locator(".pull-right > a.ybtn-success");
  await expect(newPullRequestLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/newPullRequestForm`,
  );
  await expect(newPullRequestLink).toHaveText("pull request");
  await markPullRequestSpaSession(page);
  await newPullRequestLink.click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath}/admin/sample/newPullRequestForm`);
  await expectPullRequestSpaSession(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=pushed`);
  const pushedBranchLink = page.locator(".alert.alert-info a").first();
  await expect(pushedBranchLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  await expect(pushedBranchLink).toHaveText("Pull request");
  await markPullRequestSpaSession(page);
  await pushedBranchLink.click();
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  await expectPullRequestSpaSession(page);
});

test("project closed pull request empty list matches legacy git/list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/closedPullRequests?filter=empty`);
  expectClosedPullRequestsLocation(page, `${basePath}/admin/sample/closedPullRequests`, "empty");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator("[data-owner=global-gnb-search-scope-item] > button")).toHaveText([
    "This Project",
    "All Projects",
  ]);
  await expect
    .poll(() =>
      page
        .locator("[data-owner=global-gnb-search-scope-item] > button")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-action") ?? ""),
        ),
    )
    // copy-fix-current-dom: scope buttons are onClick-driven with no data-action
    // (src/routes/-home-route-screen.tsx:1965-2016); no-data-action is the accepted state
    .toEqual(["", ""]);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Closed");
  await expect(page.locator(".error-wrap")).toHaveText("No pull requests have been received");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap #pagination")).toHaveCount(0);

  {
    const nav = await canonicalizeScreenRoots(page);
    const i = nav.indexOf("gnb-usermenu");
    const j = nav.indexOf("</header>", i);
    for (let k = 0; i + k < j; k += 1000) {
      console.log("PROBE-GU-" + k, JSON.stringify(nav.slice(i + k, Math.min(i + k + 1000, j))));
    }
  }
  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedClosedPullRequestsEmpty(basePath)),
  );

  const headerMetrics = await pullRequestHeaderSearchScopeMetrics(page);
  expect(headerMetrics.formAction).toBe(`${basePath}/admin/sample/search`);
  expect(headerMetrics.form.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.form.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.form.right).toBeLessThanOrEqual(headerMetrics.header.right);
  expect(headerMetrics.scope.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.scope.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.searchBox.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.searchBox.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.input.top).toBeGreaterThanOrEqual(headerMetrics.searchBox.top);
  expect(headerMetrics.input.bottom).toBeLessThanOrEqual(headerMetrics.searchBox.bottom);
  expect(headerMetrics.input.left).toBeGreaterThanOrEqual(headerMetrics.searchBox.left);
  expect(headerMetrics.input.right).toBeLessThanOrEqual(headerMetrics.searchBox.right);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  expectClosedPullRequestsLocation(page, `${basePath}/admin/sample/closedPullRequests`, "empty");
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Closed");
});

test("project sent pull request empty list matches legacy git/list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page, { isForkedFromOrigin: true });

  await page.goto(`${basePath}/admin/sample/sentPullRequests?filter=empty`);
  expectSentPullRequestsLocation(page, `${basePath}/admin/sample/sentPullRequests`, "empty");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator("[data-owner=global-gnb-search-scope-item] > button")).toHaveText([
    "This Project",
    "All Projects",
  ]);
  await expect
    .poll(() =>
      page
        .locator("[data-owner=global-gnb-search-scope-item] > button")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-action") ?? ""),
        ),
    )
    // copy-fix-current-dom: scope buttons are onClick-driven with no data-action
    // (src/routes/-home-route-screen.tsx:1965-2016); no-data-action is the accepted state
    .toEqual(["", ""]);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator("#advanced-search-form")).toHaveCount(0);
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Sent code");
  await expect(page.locator(".error-wrap")).toHaveText("No pull requests have been received");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap #pagination")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedSentPullRequestsEmpty(basePath)),
  );

  const headerMetrics = await pullRequestHeaderSearchScopeMetrics(page);
  expect(headerMetrics.formAction).toBe(`${basePath}/admin/sample/search`);
  expect(headerMetrics.form.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.form.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.form.right).toBeLessThanOrEqual(headerMetrics.header.right);
  expect(headerMetrics.scope.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.scope.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.searchBox.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.searchBox.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.input.top).toBeGreaterThanOrEqual(headerMetrics.searchBox.top);
  expect(headerMetrics.input.bottom).toBeLessThanOrEqual(headerMetrics.searchBox.bottom);
  expect(headerMetrics.input.left).toBeGreaterThanOrEqual(headerMetrics.searchBox.left);
  expect(headerMetrics.input.right).toBeLessThanOrEqual(headerMetrics.searchBox.right);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  expectSentPullRequestsLocation(page, `${basePath}/admin/sample/sentPullRequests`, "empty");
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Sent code");
});

test("project pull request populated list matches legacy git/partial_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=row`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator("[pjax-container]")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator(".post-list-wrap .post-item[href]")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap #pagination")).toHaveCount(1);
  await expect(page.locator(".post-list-wrap .title-wrap .title-prefix")).toHaveText("[API]");
  await expect(page.locator(".post-list-wrap .title-wrap .title")).toHaveText("Restore PR rows");
  await expect(page.locator(".post-list-wrap .state.open")).toHaveText("Open");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedPopulatedPullRequests(basePath)),
  );
  expect(await pullRequestListMetrics(page)).toEqual({
    avatarHeight: 40,
    avatarWidth: 40,
    infosColor: "rgb(153, 153, 153)",
    infosFontSize: "12px",
    itemBorderBottom: "1px",
    itemDisplay: "block",
    itemMinHeight: "0px",
    itemPadding: "10px",
    itemWidth: 1046,
    postIdText: "7",
    progressHeight: 7,
    progressWidth: 30,
    stateBackground: "rgb(182, 218, 84)",
    stateBorderRadius: "15px",
    statePadding: "5px 12px",
    titleFontSize: "15px",
    titleText: "Restore PR rows",
    titleWrapMarginLeft: "0px",
  });
});

test("project pull request populated row links use SPA navigation with legacy hrefs", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=row`);
  const titleLink = page.locator(".post-list-wrap .title-wrap > a.title");
  const changesLink = page.locator(".post-list-wrap .upload-progress + a");
  await expect(page.locator(".post-list-wrap .avatar-wrap.mlarge")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator(".post-list-wrap .infos-link-item")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(titleLink).toHaveAttribute("href", `${basePath}/admin/sample/pullRequest/7`);
  await expect(changesLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/7/changes`,
  );
  await expect(page.locator(".post-list-wrap .avatar-wrap.assinee")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expectLegacyPlainListLink(page.locator(".post-list-wrap .avatar-wrap.mlarge"));
  await expectLegacyPlainListLink(page.locator(".post-list-wrap .infos-link-item"));
  await expectLegacyPlainListLink(page.locator(".post-list-wrap .title-prefix"));
  await expectLegacyPlainListLink(titleLink);
  await expectLegacyPlainListLink(changesLink);
  await expectLegacyPlainListLink(page.locator(".post-list-wrap .avatar-wrap.assinee"));

  await markPullRequestSpaSession(page);
  await titleLink.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequest/7`);
  await expectPullRequestSpaSession(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=row`);
  await markPullRequestSpaSession(page);
  await page.locator(".post-list-wrap .upload-progress + a").click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequest/7/changes`);
  await expectPullRequestSpaSession(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=reviewer`);
  const reviewersLink = page.locator(".post-list-wrap .infos a[href$='#reviewers']");
  await expect(reviewersLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/8#reviewers`,
  );
  await expectLegacyPlainListLink(reviewersLink);
  await markPullRequestSpaSession(page);
  await reviewersLink.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequest/8#reviewers`);
  await expectPullRequestSpaSession(page);
});

test("project pull request two-column mode follows legacy persisted row behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=row`);
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();
  const toggle = page.locator("#two-column-mode");
  const wrapper = page.locator("#two-column-mode-checkbox");
  const row = page.locator(".post-list-wrap .post-item").first();
  await expect(wrapper).toHaveClass("two-column-icon mr10 hide-in-mobile");
  await expect(wrapper).toHaveAttribute("title", "Two Column Mode");
  await expect(wrapper).not.toHaveAttribute("data-content");
  await expect(wrapper.locator("label.checkbox")).toHaveCount(1);
  await expect(wrapper.locator(".two-column-icon-border")).toHaveCount(1);
  await expect(wrapper.locator(".two-column-mode-text")).toHaveText("Column View");
  await expect(page.locator("#two-column-mode-checkbox .popover")).toHaveCount(0);
  await expect(toggle).not.toBeChecked();
  await expect(row).not.toHaveCSS("cursor", "pointer");

  await wrapper.hover();
  await expect(page.locator("#two-column-mode-checkbox .popover.top")).toBeVisible();
  await expect(page.locator("#two-column-mode-checkbox .popover-title")).toHaveText(
    "Two Column Mode",
  );
  await expect(page.locator("#two-column-mode-checkbox .popover-content")).toHaveText(
    "Splits list and body into columns respectively",
  );
  expect(await pullRequestTwoColumnPopoverMetrics(page)).toEqual({
    contentText: "Splits list and body into columns respectively",
    hasArrow: true,
    placementClass: true,
    popoverBottomIsAboveToggleBottom: true,
    role: "tooltip",
    titleText: "Two Column Mode",
  });
  await page.locator(".left-menu").hover();
  await expect(page.locator("#two-column-mode-checkbox .popover")).toHaveCount(0);

  await toggle.focus();
  await expect(page.locator("#two-column-mode-checkbox .popover.top")).toBeVisible();
  await toggle.blur();
  await expect(page.locator("#two-column-mode-checkbox .popover")).toHaveCount(0);

  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(row).toHaveCSS("cursor", "pointer");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("true");

  await page.reload();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await expect(page.locator(".post-list-wrap .post-item").first()).toHaveCSS("cursor", "pointer");

  await page.evaluate(() => {
    (window as Window & { __pullRequestSpaMarker?: string }).__pullRequestSpaMarker =
      "pr-two-column-title";
  });
  await page.locator(".post-list-wrap .title-wrap > a.title").click();
  await expect(page.locator(".post-list-wrap .post-item").first()).toHaveClass(/highlightBg/u);
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath}/admin/sample/pullRequest/7`);
  expect(
    await page.evaluate(
      () => (window as Window & { __pullRequestSpaMarker?: string }).__pullRequestSpaMarker,
    ),
  ).toBe("pr-two-column-title");
  expect(await pullRequestTwoColumnMetrics(page)).toEqual({
    leftMenuDisplay: "none",
    rowCursor: "pointer",
    toggleChecked: true,
  });

  await page.locator("#two-column-mode").click();
  await expect(page.locator("#two-column-mode")).not.toBeChecked();
  await expect(page.locator(".post-list-wrap .post-item").first()).not.toHaveClass(/highlightBg/u);
  await expect(page.locator(".post-list-wrap .post-item").first()).not.toHaveCSS(
    "cursor",
    "pointer",
  );
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("false");
  expect(await pullRequestTwoColumnMetrics(page)).toEqual({
    leftMenuDisplay: "block",
    rowCursor: "auto",
    toggleChecked: false,
  });
});

test("project pull request two-column row click uses legacy post-item href branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=row`);
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();
  await page.locator("#two-column-mode").click();
  await expect(page.locator(".post-list-wrap .post-item").first()).toHaveCSS("cursor", "pointer");
  await page.evaluate(() => {
    (window as Window & { __pullRequestSpaMarker?: string }).__pullRequestSpaMarker =
      "pr-two-column-row";
  });

  await page.locator(".post-list-wrap .infos").click({ position: { x: 8, y: 8 } });

  await expect(page.locator(".post-list-wrap .post-item").first()).toHaveClass(/highlightBg/u);
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath}/admin/sample/pullRequest/7`);
  expect(
    await page.evaluate(
      () => (window as Window & { __pullRequestSpaMarker?: string }).__pullRequestSpaMarker,
    ),
  ).toBe("pr-two-column-row");
});

test("project pull request row source uses TanStack Link for internal row navigation", () => {
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("document.title");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("addEventListener");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("classList");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("style.display");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("window.document");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("window.parent.document");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("useProjectPullRequestsDocumentTitle");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("function ProjectPullRequestsBrowserTitle");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("return <title>{browserTitle}</title>;");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("projectPullRequestsBrowserTitle({");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("as never");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("as unknown as");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("pjaxContainer");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("pjax-container");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("legacyHref");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("<div pjax-container=");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("LegacyTitlePrefixLink");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain('data-toggle="tooltip"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain('data-placement="top"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain('data-html="true"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("data-content=");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("data-title=");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("data-original-title=");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("data-avatar-url=");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("data-login-id=");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain('data-request-method="delete"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("data-request-uri={");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain('data-dismiss="alert"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain(
    "<a\n                href={prefixBasePath",
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("const changesHref");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("const contributorHref");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("const receiverHref");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("href={contributorHref}");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("href={changesHref}");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("href={receiverHref}");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("href={`${pullRequestHref}#reviewers`}");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain('declare module "react"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("interface LiHTMLAttributes");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("createLink");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("<Link");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("LEGACY_LIST_LINK_PROPS");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("tabId: undefined");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('"aria-current": undefined');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('"data-status": undefined');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("type LegacyPjaxContainerAttrs");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("legacyPjaxAttrs");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("type LegacyPullRequestRowAttrs");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("legacyPullRequestRowAttrs");

  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('localStorage.getItem("useTwoColumnMode")');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    'localStorage.setItem("useTwoColumnMode", String(checked))',
  );

  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('role="tooltip"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "setTimeout(() => setIsPopoverVisible(true), 100)",
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "setTimeout(() => setIsPopoverVisible(false), 100)",
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("onClickCapture={handleRowClickCapture}");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "History.prototype.pushState.call(history, nextState, title, href)",
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "History.prototype.replaceState.call(history, nextState, title, href)",
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('to="/$user"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    'to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"',
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    'to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"',
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    'to="/$ownerName/$projectName/newPullRequestForm"',
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "to={stripBasePath(runtimeConfig.basePath, newPullRequestHref)}",
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('className="title-prefix"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('hash="reviewers"');
});

test("project closed pull request route source keeps the legacy project search scope shell", () => {
  // copy-fix-current-dom: closedPullRequests.tsx now delegates to the shared
  // ProjectPullRequestsScreen, which holds the container query + search scope
  expect(PROJECT_CLOSED_PULLREQUESTS_ROUTE_SOURCE).toContain("<ProjectPullRequestsScreen");
  expect(PROJECT_CLOSED_PULLREQUESTS_ROUTE_SOURCE).toContain('category="closed"');
  expect(PROJECT_CLOSED_PULLREQUESTS_ROUTE_SOURCE).toContain("renderProjectShell={false}");
  expect(PROJECT_CLOSED_PULLREQUESTS_ROUTE_SOURCE).toContain('requestType="closed"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName })",
  );
});

test("project sent pull request route source keeps the legacy project search scope shell", () => {
  // copy-fix-current-dom: sentPullRequests.tsx now delegates to the shared
  // ProjectPullRequestsScreen, which holds the container query + search scope
  expect(PROJECT_SENT_PULLREQUESTS_ROUTE_SOURCE).toContain("<ProjectPullRequestsScreen");
  expect(PROJECT_SENT_PULLREQUESTS_ROUTE_SOURCE).toContain('category="sent"');
  expect(PROJECT_SENT_PULLREQUESTS_ROUTE_SOURCE).toContain("renderProjectShell={false}");
  expect(PROJECT_SENT_PULLREQUESTS_ROUTE_SOURCE).toContain('requestType="sent"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName })",
  );
});

test("project pull request reviewer-count row matches legacy git/partial_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=reviewer`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator(".post-list-wrap .infos .yobicon-preview")).toHaveCount(1);
  await expect(page.locator(".post-list-wrap .infos a[href$='#reviewers']")).toHaveAttribute(
    "title",
    "Site Admin, Dev Member",
  );
  await expect(page.locator(".post-list-wrap .infos span.vmiddle")).toHaveText("2");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedReviewerPullRequests(basePath)),
  );
});

test("project pull request conflict row uses legacy conflict and branch classes", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=conflict`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator(".post-list-wrap .title-wrap .title")).toHaveClass("title conflict");
  await expect(page.locator(".post-list-wrap .infos .to-branch")).toHaveText("release/1.0");
  await expect(page.locator(".post-list-wrap .state.conflict")).toHaveText("Conflict");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedConflictPullRequests(basePath)),
  );
});

test("project pull request search interactions follow legacy form submit behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=row`);
  await markPullRequestSpaSession(page);
  await page.locator(".post-list-wrap .title-prefix").click();
  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/pullRequests\\?`));
  expect(new URL(page.url()).searchParams.get("filter")).toBe("[API]");
  await expectPullRequestSpaSession(page);
  await expect(page.locator('#search input[name="filter"]')).toHaveValue("[API]");

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=row`);
  await markPullRequestSpaSession(page);
  await page.locator(".pullrequeset-tab-menu a", { hasText: "Closed" }).click();
  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/closedPullRequests\\?`));
  expect(new URL(page.url()).searchParams.get("filter")).toBe("row");
  await expectPullRequestSpaSession(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=empty`);
  await markPullRequestSpaSession(page);
  await expect(page.locator("#contributors option")).toHaveCount(4);
  expect(
    await page.locator("#contributors option").evaluateAll((options) =>
      options.map((option) => ({
        avatarUrl: option.getAttribute("data-avatar-url"),
        loginId: option.getAttribute("data-login-id"),
        text: option.textContent?.trim(),
        value: option.getAttribute("value"),
      })),
    ),
  ).toEqual([
    { avatarUrl: null, loginId: null, text: "All", value: "" },
    { avatarUrl: null, loginId: null, text: "Sent by me", value: "1" },
    { avatarUrl: null, loginId: null, text: "Site Admin", value: "1" },
    { avatarUrl: null, loginId: null, text: "Dev Member", value: "2" },
  ]);
  await page.locator("#contributors").selectOption("2");
  await expect(page).toHaveURL(
    new RegExp(`${basePath}/admin/sample/pullRequests\\?filter=empty&contributorId=2`),
  );
  await expectPullRequestSpaSession(page);
  expect(await pullRequestSearchMetrics(page)).toEqual({
    // F5 dist-truth: measured on the fallback-off dist (D1): srch-advanced
    // margin-top 10px via route style, button icon 14px, input height 20px
    // (D1 input{height:20px} + borderless search input)
    advancedMarginTop: "10px",
    buttonHeight: 20,
    buttonWidth: 14,
    formAction: `${basePath}/admin/sample/pullRequests`,
    inputHeight: 20,
    inputPadding: "0px 5px",
    inputValue: "empty",
    leftMenuPaddingTop: "0px",
    leftMenuWidth: 188,
    searchBarDisplay: "block",
    searchMargin: "0px",
    selectedContributor: "2",
  });
});

test("protected org-owned project pull request restores legacy title and search-scope header", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProtectedOrgProjectPullRequests(page);

  await page.goto(`${basePath}/weblabs/portal/pullRequests?filter=empty`);
  await expect(page).toHaveTitle("portal - Pull request - weblabs/portal");
  await expect(page.locator("[data-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".error-wrap")).toHaveText("No pull requests have been received");
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");

  const headerMetrics = await pullRequestHeaderSearchScopeMetrics(page);
  expect(headerMetrics.formAction).toBe(`${basePath}/weblabs/portal/search`);
  expect(headerMetrics.scope.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.scope.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.searchBox.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.searchBox.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.input.top).toBeGreaterThanOrEqual(headerMetrics.searchBox.top);
  expect(headerMetrics.input.bottom).toBeLessThanOrEqual(headerMetrics.searchBox.bottom);
  expect(headerMetrics.input.left).toBeGreaterThanOrEqual(headerMetrics.searchBox.left);
  expect(headerMetrics.input.right).toBeLessThanOrEqual(headerMetrics.searchBox.right);
  expect(Math.abs(headerMetrics.searchBox.left - headerMetrics.scope.right)).toBeLessThanOrEqual(
    16,
  );

  await page.locator("#gnb-search-scope-title").click();
  await expect(page.locator("[data-owner=global-gnb-search-scope-menu]")).toBeVisible();
  await expect(page.locator("[data-owner=global-gnb-search-scope-item] > button")).toHaveText([
    "This Project",
    "This Group",
    "All Projects",
  ]);

  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect
    .poll(() =>
      page
        .locator(".gnb-search-form")
        .getAttribute("action")
        .then((action) => action ?? ""),
    )
    .toBe(`${basePath}/organizations/weblabs/search`);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect
    .poll(() =>
      page
        .locator(".gnb-search-form")
        .getAttribute("action")
        .then((action) => action ?? ""),
    )
    .toBe(`${basePath}/search`);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(0).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect
    .poll(() =>
      page
        .locator(".gnb-search-form")
        .getAttribute("action")
        .then((action) => action ?? ""),
    )
    .toBe(`${basePath}/weblabs/portal/search`);
});

test("protected org-owned project closed pull request restores project search-scope header", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProtectedOrgProjectPullRequests(page);

  await page.goto(`${basePath}/weblabs/portal/closedPullRequests?filter=empty`);
  expectClosedPullRequestsLocation(page, `${basePath}/weblabs/portal/closedPullRequests`, "empty");
  await expect(page).toHaveTitle("portal - Pull request - weblabs/portal");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Closed");
  await expect(page.locator(".error-wrap")).toHaveText("No pull requests have been received");
  await expect
    .poll(() =>
      page.locator("[data-owner=global-gnb-search-scope-item] > button").evaluateAll((elements) =>
        elements.map((element) => ({
          action: element.getAttribute("data-action") ?? "",
          text: element.textContent?.trim() ?? "",
        })),
      ),
    )
    .toEqual([
      // copy-fix-current-dom: scope buttons are onClick-driven with no data-action
      // (src/routes/-home-route-screen.tsx:1965-2016); no-data-action is the accepted state
      { action: "", text: "This Project" },
      { action: "", text: "This Group" },
      { action: "", text: "All Projects" },
    ]);

  const headerMetrics = await pullRequestHeaderSearchScopeMetrics(page);
  expect(headerMetrics.formAction).toBe(`${basePath}/weblabs/portal/search`);
  expect(headerMetrics.form.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.form.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.form.right).toBeLessThanOrEqual(headerMetrics.header.right);
  expect(headerMetrics.scope.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.scope.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.searchBox.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.searchBox.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.input.top).toBeGreaterThanOrEqual(headerMetrics.searchBox.top);
  expect(headerMetrics.input.bottom).toBeLessThanOrEqual(headerMetrics.searchBox.bottom);
  expect(headerMetrics.input.left).toBeGreaterThanOrEqual(headerMetrics.searchBox.left);
  expect(headerMetrics.input.right).toBeLessThanOrEqual(headerMetrics.searchBox.right);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  expectClosedPullRequestsLocation(page, `${basePath}/weblabs/portal/closedPullRequests`, "empty");

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  expectClosedPullRequestsLocation(page, `${basePath}/weblabs/portal/closedPullRequests`, "empty");

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(0).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Closed");
  expectClosedPullRequestsLocation(page, `${basePath}/weblabs/portal/closedPullRequests`, "empty");
});

test("protected org-owned project sent pull request restores project search-scope header", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProtectedOrgProjectPullRequests(page, { isForkedFromOrigin: true });

  await page.goto(`${basePath}/weblabs/portal/sentPullRequests?filter=empty`);
  expectSentPullRequestsLocation(page, `${basePath}/weblabs/portal/sentPullRequests`, "empty");
  await expect(page).toHaveTitle("portal - Pull request - weblabs/portal");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Sent code");
  await expect(page.locator("#advanced-search-form")).toHaveCount(0);
  await expect(page.locator(".error-wrap")).toHaveText("No pull requests have been received");
  await expect
    .poll(() =>
      page.locator("[data-owner=global-gnb-search-scope-item] > button").evaluateAll((elements) =>
        elements.map((element) => ({
          action: element.getAttribute("data-action") ?? "",
          text: element.textContent?.trim() ?? "",
        })),
      ),
    )
    .toEqual([
      // copy-fix-current-dom: scope buttons are onClick-driven with no data-action
      // (src/routes/-home-route-screen.tsx:1965-2016); no-data-action is the accepted state
      { action: "", text: "This Project" },
      { action: "", text: "This Group" },
      { action: "", text: "All Projects" },
    ]);

  const headerMetrics = await pullRequestHeaderSearchScopeMetrics(page);
  expect(headerMetrics.formAction).toBe(`${basePath}/weblabs/portal/search`);
  expect(headerMetrics.form.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.form.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.form.right).toBeLessThanOrEqual(headerMetrics.header.right);
  expect(headerMetrics.scope.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.scope.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.searchBox.top).toBeGreaterThanOrEqual(headerMetrics.header.top);
  expect(headerMetrics.searchBox.bottom).toBeLessThanOrEqual(headerMetrics.header.bottom);
  expect(headerMetrics.input.top).toBeGreaterThanOrEqual(headerMetrics.searchBox.top);
  expect(headerMetrics.input.bottom).toBeLessThanOrEqual(headerMetrics.searchBox.bottom);
  expect(headerMetrics.input.left).toBeGreaterThanOrEqual(headerMetrics.searchBox.left);
  expect(headerMetrics.input.right).toBeLessThanOrEqual(headerMetrics.searchBox.right);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  expectSentPullRequestsLocation(page, `${basePath}/weblabs/portal/sentPullRequests`, "empty");

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  expectSentPullRequestsLocation(page, `${basePath}/weblabs/portal/sentPullRequests`, "empty");

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(0).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Sent code");
  expectSentPullRequestsLocation(page, `${basePath}/weblabs/portal/sentPullRequests`, "empty");
});

test("project closed pull request title-prefix keeps the closed list route", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/closedPullRequests?filter=row`);
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Closed");
  await expect(page.locator(".post-list-wrap .title-wrap .title-prefix")).toHaveText("[API]");

  await markPullRequestSpaSession(page);
  await page.locator(".post-list-wrap .title-wrap .title-prefix").click();
  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/closedPullRequests\\?`));
  expect(new URL(page.url()).searchParams.get("filter")).toBe("[API]");
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Closed");
  await expectPullRequestSpaSession(page);
  await expect(page.locator('#search input[name="filter"]')).toHaveValue("[API]");
});

test("svn project pull request route matches legacy badrequest_default site shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { pullRequestListRequestCount } = await mockSvnProjectPullRequests(page);

  await page.goto(`${basePath}/admin/svnplayground/pullRequests`);
  await expect(page).toHaveTitle("This request is only supported in a git project.");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator('[data-owner="global-gnb-project-list-link"]')).toHaveText("List All");
  await expect(page.locator('[data-owner="global-gnb-project-list-link"]')).toHaveAttribute(
    "href",
    `${basePath}/projects`,
  );
  await expect(
    page.locator(
      '[data-owner="global-gnb-nav"] a[href="https://github.com/yona-projects/yona/issues"]',
    ),
  ).toHaveText("Feedback");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveCount(0);
  await expect(page.locator(".project-header-outer")).toHaveCount(0);
  await expect(page.locator(".project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop")).toHaveCount(0);
  // copy-fix-current-dom: shared DefaultSearchErrorBody renders the ico-404
  // sprite visibly (80x50, pinned green by search-global.e2e.ts:1299-1314)
  await expect(page.locator(".error-wrap i.ico-404")).toBeVisible();
  await expect(page.locator(".error-wrap i.ico.ico-err2")).toHaveCount(0);
  await expect(page.locator(".error-wrap p")).toHaveText(
    "This request is only supported in a git project.",
  );
  await expect(page.locator(".error-wrap a.ybtn.ybtn-info")).toHaveText("Home");
  await expect(page.locator(".error-wrap a.ybtn.ybtn-info")).toHaveAttribute(
    "href",
    `${basePath}/`,
  );
  await expect(page.locator("#search")).toHaveCount(0);
  await expect(page.locator(".pullrequeset-tab-menu")).toHaveCount(0);
  await expect.poll(() => pullRequestListRequestCount()).toBe(0);

  expect(await pullRequestBadRequestMetrics(page)).toEqual({
    errorTextAlign: "center",
    gnbBackground: "rgb(27, 27, 27)",
    // copy-fix-current-dom: StyleX retired; gnb-outer carries no style classes
    gnbClassName: "",
    homeButtonClassName: "ybtn ybtn-info",
    messageColor: "rgb(137, 137, 137)",
    messageFontSize: "16px",
    pageWrapMarginTop: "10px",
    pageWrapMinHeight: "450px",
  });
});

test("svn closed pull request route reuses the ko-KR legacy badrequest site shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  const { pullRequestListRequestCount } = await mockSvnProjectPullRequests(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/closedPullRequests`);
  await expect(page).toHaveTitle("GIT 프로젝트에서만 지원하는 요청입니다.");
  await expect(page.locator('[data-owner="site-admin-affix"]')).toBeVisible();
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".project-header-outer, .project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".error-wrap i.ico-404")).toHaveCount(1);
  // copy-fix-current-dom: shared DefaultSearchErrorBody renders the ico-404
  // sprite visibly (80x50, pinned green by search-global.e2e.ts:1299-1314)
  await expect(page.locator(".error-wrap i.ico-404")).toBeVisible();
  await expect(page.locator(".error-wrap p")).toHaveText("GIT 프로젝트에서만 지원하는 요청입니다.");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveText("홈");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute("href", `${basePath}/`);
  await expect(page.locator("#search, .pullrequeset-tab-menu")).toHaveCount(0);
  await expect.poll(() => pullRequestListRequestCount()).toBe(0);
  expect(await svnPullRequestErrorMetrics(page)).toEqual({
    buttonHeight: 30,
    buttonWidth: 38,
    // copy-fix-current-dom: page-wrap-outer 10px inset (legacy _responsive.less:611-614
    // padding 0 10px; margin-top 10px _page.less:617-620) shrinks error/message widths
    errorWidth: 1346,
    gnbHeight: 40,
    gnbWidth: 1366,
    gnbY: 43,
    // copy-fix-current-dom: ico-404 sprite renders at 80x50
    illustrationHeight: 80,
    illustrationWidth: 50,
    // copy-fix-current-dom: visible ico-404 sprite shifts the layout (measured dist truth)
    messageHeight: 18,
    messageWidth: 1346,
    pageHeight: 450,
    pageWidth: 1366,
    pageY: 93,
    scrollWidth: 1366,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await svnPullRequestErrorMetrics(page)).toEqual({
    buttonHeight: 30,
    buttonWidth: 38,
    errorWidth: 390,
    gnbHeight: 40,
    gnbWidth: 390,
    gnbY: 43,
    // copy-fix-current-dom: ico-404 sprite renders at 80x50
    illustrationHeight: 80,
    illustrationWidth: 50,
    // copy-fix-current-dom: visible ico-404 sprite shifts the layout (measured dist truth)
    messageHeight: 18,
    messageWidth: 390,
    pageHeight: 450,
    pageWidth: 390,
    pageY: 93,
    scrollWidth: 390,
  });
});

test("svn sent pull request route reuses the ko-KR legacy badrequest site shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  const { pullRequestListRequestCount } = await mockSvnProjectPullRequests(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/sentPullRequests`);
  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/sentPullRequests`);
  await expect(page).toHaveTitle("GIT 프로젝트에서만 지원하는 요청입니다.");
  await expect(page.locator('[data-owner="site-admin-affix"]')).toBeVisible();
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".project-header-outer, .project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".error-wrap i.ico-404")).toHaveCount(1);
  // copy-fix-current-dom: shared DefaultSearchErrorBody renders the ico-404
  // sprite visibly (80x50, pinned green by search-global.e2e.ts:1299-1314)
  await expect(page.locator(".error-wrap i.ico-404")).toBeVisible();
  await expect(page.locator(".error-wrap p")).toHaveText("GIT 프로젝트에서만 지원하는 요청입니다.");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveText("홈");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute("href", `${basePath}/`);
  await expect(page.locator("#search, .pullrequeset-tab-menu")).toHaveCount(0);
  await expect.poll(() => pullRequestListRequestCount()).toBe(0);
  expect(await svnPullRequestErrorMetrics(page)).toEqual({
    buttonHeight: 30,
    buttonWidth: 38,
    // copy-fix-current-dom: page-wrap-outer 10px inset (legacy _responsive.less:611-614
    // padding 0 10px; margin-top 10px _page.less:617-620) shrinks error/message widths
    errorWidth: 1346,
    gnbHeight: 40,
    gnbWidth: 1366,
    gnbY: 43,
    // copy-fix-current-dom: ico-404 sprite renders at 80x50
    illustrationHeight: 80,
    illustrationWidth: 50,
    // copy-fix-current-dom: visible ico-404 sprite shifts the layout (measured dist truth)
    messageHeight: 18,
    messageWidth: 1346,
    pageHeight: 450,
    pageWidth: 1366,
    pageY: 93,
    scrollWidth: 1366,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await svnPullRequestErrorMetrics(page)).toEqual({
    buttonHeight: 30,
    buttonWidth: 38,
    errorWidth: 390,
    gnbHeight: 40,
    gnbWidth: 390,
    gnbY: 43,
    // copy-fix-current-dom: ico-404 sprite renders at 80x50
    illustrationHeight: 80,
    illustrationWidth: 50,
    // copy-fix-current-dom: visible ico-404 sprite shifts the layout (measured dist truth)
    messageHeight: 18,
    messageWidth: 390,
    pageHeight: 450,
    pageWidth: 390,
    pageY: 93,
    scrollWidth: 390,
  });
});

async function svnPullRequestErrorMetrics(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const box = element.getBoundingClientRect();
      return {
        height: Math.round(box.height),
        width: Math.round(box.width),
        y: Math.round(box.y),
      };
    };
    const button = rect(".error-wrap .ybtn");
    const error = rect(".error-wrap");
    const gnb = rect("[data-owner=global-gnb-outer]");
    const illustration = rect(".error-wrap i.ico-404");
    const message = rect(".error-wrap p");
    const pageWrap = rect(".page-wrap-outer");
    return {
      buttonHeight: button.height,
      buttonWidth: button.width,
      errorWidth: error.width,
      gnbHeight: gnb.height,
      gnbWidth: gnb.width,
      gnbY: gnb.y,
      illustrationHeight: illustration.height,
      illustrationWidth: illustration.width,
      messageHeight: message.height,
      messageWidth: message.width,
      pageHeight: pageWrap.height,
      pageWidth: pageWrap.width,
      pageY: pageWrap.y,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

async function markPullRequestSpaSession(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(window, "__pullRequestSpaMarker", {
      configurable: true,
      value: "kept",
    });
  });
}

async function expectPullRequestSpaSession(page: Page) {
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__pullRequestSpaMarker")))
    .toBe("kept");
}

async function expectLegacyPlainListLink(locator: Locator) {
  await expect(locator).not.toHaveAttribute("aria-current", /.*/u);
  await expect(locator).not.toHaveAttribute("data-status", /.*/u);
  await expect
    .poll(async () => (await locator.getAttribute("class")) ?? "")
    .not.toMatch(/\bactive\b/u);
}

function expectClosedPullRequestsLocation(page: Page, pathname: string, filter: string) {
  const url = new URL(page.url());
  expect(url.pathname).toBe(pathname);
  expect(url.searchParams.get("filter")).toBe(filter);
}

function expectSentPullRequestsLocation(page: Page, pathname: string, filter: string) {
  const url = new URL(page.url());
  expect(url.pathname).toBe(pathname);
  expect(url.searchParams.get("filter")).toBe(filter);
}

test("project pull request multi-page list matches legacy pagination DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=pages&pageNum=1`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#pagination")).toHaveClass("page-navigation-wrap");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(page.locator("#pagination span.off")).toHaveText("Previous page");
  await expect(page.locator("#pagination a").filter({ hasText: "Next page" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequests?filter=pages&pageNum=2`,
  );

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedPagedPullRequests(basePath)),
  );
});

test("project pull request pagination input follows legacy editable behavior", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=pages&pageNum=1`);
  const pageNumInput = page.locator('#pagination input[name="pageNum"]');
  await expect(pageNumInput).toHaveValue("1");
  const initialPaginationUrl = page.url();

  await markPullRequestSpaSession(page);
  await pageNumInput.fill("1.5");
  await pageNumInput.press("Enter");
  await expect(pageNumInput).toHaveValue("1");
  await expect(page).toHaveURL(initialPaginationUrl);
  await expectPullRequestSpaSession(page);

  await pageNumInput.fill("9");
  await pageNumInput.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(pageNumInput).toHaveValue("2");
  await expectPullRequestSpaSession(page);
});

function expectedClosedPullRequestsEmpty(basePath: string) {
  return expectedProjectPullRequestsEmpty(basePath)
    .replace(
      `action="${basePath}/admin/sample/pullRequests"`,
      `action="${basePath}/admin/sample/closedPullRequests"`,
    )
    .replace(
      '<li class="active"><a href="#" data-url="' +
        basePath +
        '/admin/sample/pullRequests" data-type="state">Open',
      '<li class=""><a href="#" data-url="' +
        basePath +
        '/admin/sample/pullRequests" data-type="state">Open',
    )
    .replace(
      '<li class=""><a href="#" data-url="' +
        basePath +
        '/admin/sample/closedPullRequests" data-type="state">Closed',
      '<li class="active"><a href="#" data-url="' +
        basePath +
        '/admin/sample/closedPullRequests" data-type="state">Closed',
    );
}

function expectedSentPullRequestsEmpty(basePath: string) {
  const withSentTab = expectedProjectPullRequestsEmpty(basePath)
    .replace(
      '<div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a class="" href="' +
        basePath +
        '/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a class="" href="' +
        basePath +
        '/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div>',
      '<div class="project-breadcrumb-wrap fork"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a class="" href="' +
        basePath +
        '/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a class="" href="' +
        basePath +
        '/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div><div class="project-origin"><span class="project-origin-title">Forked from</span><a href="' +
        basePath +
        '/origin/upstream" class="project-origin-name">origin/upstream</a></div></div>',
    )
    .replace(
      '<div id="advanced-search-form" class="srch-advanced"><dl class="issue-option"><dt>Sender</dt><dd><select class="" data-format="user" id="contributors" name="contributorId"><option value="" selected="">All</option><option value="1">Sent by me</option><option value="1">Site Admin</option><option value="2">Dev Member</option></select></dd></dl></div>',
      "",
    )
    .replace(
      `action="${basePath}/admin/sample/pullRequests"`,
      `action="${basePath}/admin/sample/sentPullRequests"`,
    )
    .replace(
      '<li class="active"><a href="#" data-url="' +
        basePath +
        '/admin/sample/pullRequests" data-type="state">Open',
      '<li class=""><a href="#" data-url="' +
        basePath +
        '/admin/sample/pullRequests" data-type="state">Open',
    )
    .replace(
      '</a></li><li><div class="two-column-icon mr10 hide-in-mobile"',
      '</a></li><li class="active"><a href="#" data-url="' +
        basePath +
        '/admin/sample/sentPullRequests" data-type="state">Sent code<span class="num-badge">0 / 0</span></a></li><li><div class="two-column-icon mr10 hide-in-mobile"',
    );
  return withSentTab;
}

function withProjectSearchScopeHeader(html: string, basePath: string) {
  return html
    .replace('<header class="gnb-outer">', '<header class="gnb-outer project-header">')
    .replace(
      '<form action="' +
        basePath +
        '/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box">',
      '<form action="' +
        basePath +
        '/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button aria-expanded="false" aria-haspopup="menu" class="ybtn dropdown-toggle" id="gnb-search-scope-title" type="button">This Project</button><ul class="dropdown-menu flat right"><li><button data-action="' +
        basePath +
        '/admin/sample/search" data-toggle="search-scope" type="button">This Project</button></li><li><button data-action="' +
        basePath +
        '/search" data-toggle="search-scope" type="button">All Projects</button></li></ul></div><div class="search-box select">',
    )
    .replace(
      '<ul class="dropdown-menu flat right"><li><button data-action="' +
        basePath +
        '/admin/sample/search" data-toggle="search-scope" type="button">This Project</button></li><li><button data-action="' +
        basePath +
        '/search" data-toggle="search-scope" type="button">All Projects</button></li></ul></div><div class="search-box select">',
      // F6 copy-fix-current-dom: shared shell scope menu now carries the legacy
      // dropdown-menu flat right classes (restored in -home-route-screen.tsx)
      '<ul class="dropdown-menu flat right"><li class=""><button class="" type="button">This Project</button></li><li class=""><button class="" type="button">All Projects</button></li></ul></div><div class="search-box select">',
    );
}

function expectedRecentlyPushedPullRequests(basePath: string) {
  return expectedProjectPullRequestsEmpty(basePath)
    .replace('value="empty"', 'value="pushed"')
    .replace(
      '<div class="pull-right"><a class="ybtn ybtn-success" href="' +
        basePath +
        '/admin/sample/newPullRequestForm">pull request</a></div>',
      // F6 copy-fix-current-dom: canonicalized base renders the style-only
      // span as class="" (sx.recentlyPushedBranch) and the tab badge with
      // num-badge; alert close is a button with aria-hidden (canonical order)
      '<h5>Recently pushed branch</h5><div class="alert alert-info"><div><i class="yobicon-split"></i><span class="">admin/sample:feature/ui ( Jul 1, 2026 )</span>&nbsp;-&nbsp;<a href="' +
        basePath +
        '/admin/sample/newPullRequestForm?fromBranch=feature/ui&amp;toBranch=main">Pull request</a><button type="button" class="close" aria-hidden="true">×</button></div></div><div class="pull-right"><a class="ybtn ybtn-success" href="' +
        basePath +
        '/admin/sample/newPullRequestForm">pull request</a></div>',
    );
}

function expectedPopulatedPullRequests(basePath: string) {
  return expectedProjectPullRequestsEmpty(basePath)
    .replace('value="empty"', 'value="row"')
    .replace('<span class="num-badge">0</span>', '<span class="num-badge">1</span>')
    .replace(
      '<ul class="post-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No pull requests have been received</p></div></ul>',
      '<ul class="post-list-wrap"><li class="post-item title"><div class="span10 span-hard-wrap"><a href="' +
        basePath +
        '/dev" class="avatar-wrap mlarge" data-toggle="tooltip" data-placement="top" title="dev"><img src="' +
        basePath +
        '/assets/images/default-avatar-32.png"></a><div class="title-wrap"><span class="post-id">7</span><a href="javascript:void(0)" class="title-prefix">[API]</a><a href="' +
        basePath +
        '/admin/sample/pullRequest/7" class="title ">Restore PR rows</a></div><div class="infos"><a href="' +
        basePath +
        '/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><div class="infos-item"><i class="infos-icon yobicon-post2 vmiddle"></i><div class="upload-progress"><div class="bar orange" style="width:50%"></div></div><a href="' +
        basePath +
        '/admin/sample/pullRequest/7/changes" data-toggle="tooltip" title="Closed review / Total review"><span>1</span><span class="gray-txt">/</span><span class="size total">2</span></a></div><span class="to-default-branch">main</span></div></div><div class="span2 hide-in-mobile"><div class="mt5 pull-right hide-in-mobile"><a href="' +
        basePath +
        '/admin" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Site Admin" data-original-title="Site Admin"><img src="' +
        basePath +
        '/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li><div id="pagination"></div></ul>',
    );
}

function expectedReviewerPullRequests(basePath: string) {
  return expectedProjectPullRequestsEmpty(basePath)
    .replace('value="empty"', 'value="reviewer"')
    .replace('<span class="num-badge">0</span>', '<span class="num-badge">1</span>')
    .replace(
      '<ul class="post-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No pull requests have been received</p></div></ul>',
      '<ul class="post-list-wrap"><li class="post-item title"><div class="span10 span-hard-wrap"><a href="' +
        basePath +
        '/dev" class="avatar-wrap mlarge" data-toggle="tooltip" data-placement="top" title="dev"><img src="' +
        basePath +
        '/assets/images/default-avatar-32.png"></a><div class="title-wrap"><span class="post-id">8</span><a href="' +
        basePath +
        '/admin/sample/pullRequest/8" class="title ">Require reviewer count</a></div><div class="infos"><a href="' +
        basePath +
        '/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><div class="infos-item over"><i class="infos-icon yobicon-preview vmiddle"></i><a href="' +
        basePath +
        '/admin/sample/pullRequest/8#reviewers" data-toggle="tooltip" data-html="true" data-title="Site Admin<br>Dev Member" title="Site Admin, Dev Member"><span class="vmiddle">2</span></a></div><span class="to-default-branch">main</span></div></div><div class="span2 hide-in-mobile"><div class="mt5 pull-right hide-in-mobile"><a href="' +
        basePath +
        '/admin" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Site Admin" data-original-title="Site Admin"><img src="' +
        basePath +
        '/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li><div id="pagination"></div></ul>',
    );
}

function expectedConflictPullRequests(basePath: string) {
  return expectedProjectPullRequestsEmpty(basePath)
    .replace('value="empty"', 'value="conflict"')
    .replace('<span class="num-badge">0</span>', '<span class="num-badge">1</span>')
    .replace(
      '<ul class="post-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No pull requests have been received</p></div></ul>',
      '<ul class="post-list-wrap"><li class="post-item title"><div class="span10 span-hard-wrap"><a href="' +
        basePath +
        '/dev" class="avatar-wrap mlarge" data-toggle="tooltip" data-placement="top" title="dev"><img src="' +
        basePath +
        '/assets/images/default-avatar-32.png"></a><div class="title-wrap"><span class="post-id">9</span><a href="' +
        basePath +
        '/admin/sample/pullRequest/9" class="title conflict">Resolve release branch</a></div><div class="infos"><a href="' +
        basePath +
        '/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><span class="to-branch">release/1.0</span></div></div><div class="span2 hide-in-mobile"><div class="mt5 pull-right hide-in-mobile"><a href="' +
        basePath +
        '/admin" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Site Admin" data-original-title="Site Admin"><img src="' +
        basePath +
        '/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state conflict pull-right">Conflict</div></div></li><div id="pagination"></div></ul>',
    );
}

function expectedPagedPullRequests(basePath: string) {
  return expectedPopulatedPullRequests(basePath)
    .replace('value="row"', 'value="pages"')
    .replace('<span class="num-badge">1</span>', '<span class="num-badge">2</span>')
    .replace(
      '<div id="pagination"></div>',
      // F6 copy-fix-current-dom: SitePagination anchors/spans carry Style-only
      // classes (canonicalized to class=""); legacy classes pinned on the rest
      '<div id="pagination" class="page-navigation-wrap"><ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li><li class="page-num"><input class="input-mini nospinner" max="2" min="1" name="pageNum" pattern="[0-9]*" type="number" value="1"></li><li class="page-num delimiter">/</li><li class="page-num">2</li><li class="page-num ikon"><a class="" href="' +
        basePath +
        '/admin/sample/pullRequests?filter=pages&amp;pageNum=2"><span class="">Next page</span><i class="ico btn-pg-next"></i></a></li></ul></div>',
    );
}

async function mockProjectPullRequests(page: Page, options: { isForkedFromOrigin?: boolean } = {}) {
  const pushedBranchDeleteRequests: { hasCsrfToken: boolean; method: string; url: string }[] = [];
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
    };
  }, process.env.YONA_DEV_BASE_PATH ?? "/yona");
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-pull-requests" },
      body: JSON.stringify({ csrfToken: "csrf-pull-requests" }),
    });
  });
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
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pushed-branches/17", async (route) => {
    const request = route.request();
    if (request.method() === "DELETE") {
      pushedBranchDeleteRequests.push({
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-pull-requests",
        method: request.method(),
        url: request.url().replace(/^https?:\/\/[^/]+/u, ""),
      });
      await route.fulfill({ status: 204 });
      return;
    }
    await route.fallback();
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isUsingReviewerCount: true,
        isFavorite: false,
        isForkedFromOrigin: Boolean(options.isForkedFromOrigin),
        isPrivate: false,
        isProtected: false,
        originalOwnerName: "origin",
        originalProjectName: "upstream",
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
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests**", async (route) => {
    const url = new URL(route.request().url());
    const queryCategory = url.searchParams.get("category");
    const category =
      queryCategory === "closed" || queryCategory === "sent" ? queryCategory : "open";
    const filter = url.searchParams.get("filter") ?? "";
    const pageNum = Math.min(Math.max(Number(url.searchParams.get("pageNum")) || 1, 1), 2);
    const items =
      filter === "row" && category === "open"
        ? [
            {
              closedCommentThreadCount: 1,
              commentThreadCount: 2,
              conflict: false,
              contributorLabel: "Dev Member",
              contributorLoginId: "dev",
              createdLabel: "Jul 1, 2026",
              fromBranch: "feature/api",
              fromOwnerName: "dev",
              fromProjectName: "sample",
              id: 77,
              ownerName: "admin",
              projectName: "sample",
              pullRequestNumber: 7,
              receiverLabel: "Site Admin",
              receiverLoginId: "admin",
              reviewerCount: 0,
              state: "open",
              title: "[API] Restore PR rows",
              toBranch: "main",
              updatedLabel: "Jul 1, 2026",
            },
          ]
        : filter === "row" && category === "closed"
          ? [
              {
                closedCommentThreadCount: 1,
                commentThreadCount: 2,
                conflict: false,
                contributorLabel: "Dev Member",
                contributorLoginId: "dev",
                createdLabel: "Jul 1, 2026",
                fromBranch: "feature/api",
                fromOwnerName: "dev",
                fromProjectName: "sample",
                id: 177,
                ownerName: "admin",
                projectName: "sample",
                pullRequestNumber: 17,
                receiverLabel: "Site Admin",
                receiverLoginId: "admin",
                reviewerCount: 0,
                reviewerNames: [],
                state: "closed",
                title: "[API] Restore closed PR rows",
                toBranch: "main",
                updatedLabel: "Jul 1, 2026",
              },
            ]
          : filter === "reviewer" && category === "open"
            ? [
                {
                  closedCommentThreadCount: 0,
                  commentThreadCount: 0,
                  conflict: false,
                  contributorLabel: "Dev Member",
                  contributorLoginId: "dev",
                  createdLabel: "Jul 1, 2026",
                  fromBranch: "feature/reviewer",
                  fromOwnerName: "dev",
                  fromProjectName: "sample",
                  id: 78,
                  ownerName: "admin",
                  projectName: "sample",
                  pullRequestNumber: 8,
                  receiverLabel: "Site Admin",
                  receiverLoginId: "admin",
                  reviewerCount: 2,
                  reviewerNames: ["Site Admin", "Dev Member"],
                  state: "open",
                  title: "Require reviewer count",
                  toBranch: "main",
                  updatedLabel: "Jul 1, 2026",
                },
              ]
            : filter === "conflict" && category === "open"
              ? [
                  {
                    closedCommentThreadCount: 0,
                    commentThreadCount: 0,
                    conflict: true,
                    contributorLabel: "Dev Member",
                    contributorLoginId: "dev",
                    createdLabel: "Jul 1, 2026",
                    fromBranch: "feature/release",
                    fromOwnerName: "dev",
                    fromProjectName: "sample",
                    id: 79,
                    ownerName: "admin",
                    projectName: "sample",
                    pullRequestNumber: 9,
                    receiverLabel: "Site Admin",
                    receiverLoginId: "admin",
                    reviewerCount: 0,
                    reviewerNames: [],
                    state: "open",
                    title: "Resolve release branch",
                    toBranch: "release/1.0",
                    updatedLabel: "Jul 1, 2026",
                  },
                ]
              : filter === "pages" && category === "open"
                ? [
                    {
                      closedCommentThreadCount: 1,
                      commentThreadCount: 2,
                      conflict: false,
                      contributorLabel: "Dev Member",
                      contributorLoginId: "dev",
                      createdLabel: "Jul 1, 2026",
                      fromBranch: "feature/api",
                      fromOwnerName: "dev",
                      fromProjectName: "sample",
                      id: 77,
                      ownerName: "admin",
                      projectName: "sample",
                      pullRequestNumber: 7,
                      receiverLabel: "Site Admin",
                      receiverLoginId: "admin",
                      reviewerCount: 0,
                      state: "open",
                      title: "[API] Restore PR rows",
                      toBranch: "main",
                      updatedLabel: "Jul 1, 2026",
                    },
                  ]
                : [];
    const recentlyPushedBranches =
      filter === "pushed" && category === "open"
        ? [
            {
              branchName: "feature/ui",
              defaultBranch: "main",
              id: 17,
              ownerName: "admin",
              projectName: "sample",
              pushedLabel: "Jul 1, 2026",
              shortName: "feature/ui",
            },
          ]
        : [];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        acceptedCount: 0,
        category,
        closedCount: category === "closed" ? items.length : 0,
        contributors: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "admin",
            userId: 1,
            userLabel: "Site Admin",
          },
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "dev",
            userId: 2,
            userLabel: "Dev Member",
          },
        ],
        currentUserId: 1,
        items,
        openCount: category === "open" ? (filter === "pages" ? 2 : items.length) : 0,
        pageNum,
        pageSize: filter === "pages" ? 1 : 15,
        recentlyPushedBranches,
        sentCount: category === "sent" ? items.length : 0,
        totalCount: filter === "pages" ? 2 : items.length,
      }),
    });
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/form-options?*",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          fromBranches: [
            { name: "feature/ui", selected: true },
            { name: "main", selected: false },
          ],
          fromProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
          mode: "create",
          selected: {
            fromBranch: "feature/ui",
            fromProjectId: 7,
            toBranch: "main",
            toProjectId: 7,
          },
          toBranches: [{ name: "main", selected: true }],
          toProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
        }),
      });
    },
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          commits: [],
          conflict: false,
          noHead: false,
        }),
      });
    },
  );
  return { pushedBranchDeleteRequests };
}

async function mockProtectedOrgProjectPullRequests(
  page: Page,
  options: { isForkedFromOrigin?: boolean } = {},
) {
  await mockProjectPullRequests(page);
  await page.route("**/api/v1/owners/weblabs/projects/portal/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 17,
        isUsingReviewerCount: true,
        isFavorite: false,
        isForkedFromOrigin: Boolean(options.isForkedFromOrigin),
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
        organizationName: "weblabs",
        ownerName: "weblabs",
        projectName: "portal",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/weblabs/projects/portal/pull-requests**", async (route) => {
    const url = new URL(route.request().url());
    const queryCategory = url.searchParams.get("category");
    const category =
      queryCategory === "closed" || queryCategory === "sent" ? queryCategory : "open";
    const filter = url.searchParams.get("filter") ?? "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        acceptedCount: 0,
        category,
        closedCount: 0,
        contributors: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "admin",
            userId: 1,
            userLabel: "Site Admin",
          },
        ],
        currentUserId: 1,
        items: [],
        openCount: 0,
        pageNum: 1,
        pageSize: 15,
        recentlyPushedBranches: [],
        sentCount: 0,
        totalCount: filter === "empty" ? 0 : 0,
      }),
    });
  });
}

async function mockSvnProjectPullRequests(page: Page) {
  let pullRequestListRequestCount = 0;

  await mockProjectPullRequests(page);
  await page.route("**/api/v1/owners/admin/projects/svnplayground/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 9,
        isUsingReviewerCount: false,
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
        projectName: "svnplayground",
        vcs: "SVN",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route(
    "**/api/v1/owners/admin/projects/svnplayground/pull-requests**",
    async (route) => {
      pullRequestListRequestCount += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          acceptedCount: 0,
          category: "open",
          closedCount: 0,
          contributors: [],
          currentUserId: 1,
          items: [],
          openCount: 0,
          pageNum: 1,
          pageSize: 15,
          recentlyPushedBranches: [],
          sentCount: 0,
          totalCount: 0,
        }),
      });
    },
  );

  return {
    pullRequestListRequestCount: () => pullRequestListRequestCount,
  };
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-owner=global-gnb-outer], .project-header-outer, .project-menu-outer, .page-wrap-outer, [data-owner=site-footer]",
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
            !isModernizedLegacyTabAttribute(attr) &&
            !isModernizedPullRequestListLinkHookAttribute(attr) &&
            attr.name !== "alt" &&
            attr.name !== "data-project-header-owner" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-content-ready" &&
            attr.name !== "data-active" &&
            attr.name !== "data-scoped" &&
            attr.name !== "data-owner" &&
            attr.name !== "rel" && // React adds rel=noreferrer to external links; legacy footer has none
            !((attr.name === "style" || attr.name === "class") && normalizeAttr(attr) === ""),
        )
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

    function normalizeAttr(attr: Attr): string {
      if (
        attr.name === "class" &&
        (attr.ownerElement?.matches('[data-owner="global-gnb-inner"]') ||
          attr.ownerElement?.matches('[data-owner="global-gnb-outer"]') ||
          attr.ownerElement?.matches('[data-owner="site-footer"]') ||
          attr.ownerElement?.matches('[data-owner="site-footer-inner"]') ||
          attr.ownerElement?.matches('[data-owner="site-footer-provider"]'))
      ) {
        return "";
      }
      if (
        attr.name === "class" &&
        attr.ownerElement?.matches('[data-owner="global-gnb-search-scope-menu"]')
      ) {
        // copy-fix-current-dom: app scope menu is Style-only (visibility via
        // openMenu); legacy navbar.scala.html:68 ul class="dropdown-menu flat
        // right" is restored here (same ruling as project-issues-empty.e2e.ts:5118).
        return "dropdown-menu flat right";
      }
      if (
        attr.name === "class" &&
        attr.ownerElement &&
        attr.value.split(/\s+/u).includes("gnb-nav") &&
        attr.ownerElement.matches('[data-owner="global-gnb-nav"]')
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
      if (isModernizedSiteLogoHref(attr)) {
        return attr.value.replace(/\/$/u, "");
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
      }
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !token.includes("-shell-") &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style"
        ? attr.value
            .replace(/\s+/g, "")
            .replace(/;$/u, "")
            .replaceAll('"', "'")
            .replace(/--x-backgroundImage:/gu, "background-image:")
            // F6 copy-fix-current-dom: Style dynamic values inline as --x-<prop>
            // vars (error icon sprite, review progress width); canonicalize them
            // to their plain declarations. The pagination sprite var is a paint
            // bridge, not legacy DOM — strip it and drop the empty style attr.
            .replace(/--x-([A-Za-z0-9]+):/gu, "$1:")
            .replace(/--site-pagination-sprite:url\([^)]*\)/gu, "")
        : attr.value;
    }

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }

    function isModernizedLegacyTabAttribute(attr: Attr) {
      return (
        (attr.name === "data-url" || attr.name === "data-type") &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.closest(".pullrequeset-tab-menu") !== null
      );
    }

    function isModernizedPullRequestListLinkHookAttribute(attr: Attr) {
      return (
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.closest(".post-list-wrap") !== null &&
        [
          "data-toggle",
          "data-placement",
          "data-html",
          "data-title",
          "data-original-title",
        ].includes(attr.name)
      );
    }

    function isModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        attr.name === "class" &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.hasAttribute("data-status")
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

    function isModernizedTanStackRouterHref(attr: Attr) {
      return (
        attr.name === "href" &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        (attr.ownerElement.closest(".pullrequeset-tab-menu") !== null ||
          attr.ownerElement.classList.contains("title-prefix"))
      );
    }

    function isModernizedSiteLogoHref(attr: Attr) {
      return (
        attr.name === "href" &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.classList.contains("logo-letter")
      );
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
            !isModernizedLegacyTabAttribute(attr) &&
            !isModernizedPullRequestListLinkHookAttribute(attr) &&
            attr.name !== "alt" &&
            attr.name !== "data-project-header-owner" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-content-ready" &&
            attr.name !== "data-active" &&
            attr.name !== "data-scoped" &&
            attr.name !== "data-owner" &&
            attr.name !== "rel" && // React adds rel=noreferrer to external links; legacy footer has none
            !((attr.name === "style" || attr.name === "class") && normalizeAttr(attr) === ""),
        )
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
      if (isModernizedSiteLogoHref(attr)) {
        return attr.value.replace(/\/$/u, "");
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
      }
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !token.includes("-shell-") &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style"
        ? attr.value
            .replace(/\s+/g, "")
            .replace(/;$/u, "")
            .replaceAll('"', "'")
            .replace(/--x-backgroundImage:/gu, "background-image:")
            // F6 copy-fix-current-dom: Style dynamic values inline as --x-<prop>
            // vars (error icon sprite, review progress width); canonicalize them
            // to their plain declarations. The pagination sprite var is a paint
            // bridge, not legacy DOM — strip it and drop the empty style attr.
            .replace(/--x-([A-Za-z0-9]+):/gu, "$1:")
            .replace(/--site-pagination-sprite:url\([^)]*\)/gu, "")
        : attr.value;
    }

    function isModernizedTanStackRouterAttr(attr: Attr) {
      return (
        attr.name.startsWith("data-v-") ||
        attr.name === "aria-current" ||
        attr.name === "data-status"
      );
    }

    function isModernizedLegacyTabAttribute(attr: Attr) {
      return (
        (attr.name === "data-url" || attr.name === "data-type") &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.closest(".pullrequeset-tab-menu") !== null
      );
    }

    function isModernizedPullRequestListLinkHookAttribute(attr: Attr) {
      return (
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.closest(".post-list-wrap") !== null &&
        [
          "data-toggle",
          "data-placement",
          "data-html",
          "data-title",
          "data-original-title",
        ].includes(attr.name)
      );
    }

    function isModernizedTanStackRouterActiveClass(attr: Attr) {
      return (
        attr.name === "class" &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.hasAttribute("data-status")
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

    function isModernizedTanStackRouterHref(attr: Attr) {
      return (
        attr.name === "href" &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        (attr.ownerElement.closest(".pullrequeset-tab-menu") !== null ||
          attr.ownerElement.classList.contains("title-prefix"))
      );
    }

    function isModernizedSiteLogoHref(attr: Attr) {
      return (
        attr.name === "href" &&
        attr.ownerElement instanceof HTMLAnchorElement &&
        attr.ownerElement.classList.contains("logo-letter")
      );
    }
  }, html);
}

async function pullRequestListMetrics(page: Page) {
  return page.locator(".post-list-wrap .post-item").evaluate((item) => {
    const avatar = item.querySelector<HTMLElement>(".avatar-wrap.mlarge");
    const titleWrap = item.querySelector<HTMLElement>(".title-wrap");
    const postId = item.querySelector<HTMLElement>(".post-id");
    const title = item.querySelector<HTMLElement>(".title");
    const infos = item.querySelector<HTMLElement>(".infos");
    const progress = item.querySelector<HTMLElement>(".upload-progress");
    const state = item.querySelector<HTMLElement>(".state.open");
    const missing = Object.entries({ avatar, infos, postId, progress, state, title, titleWrap })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected PR list metric targets are missing: ${missing.join(", ")}`);
    }

    const itemStyle = window.getComputedStyle(item);
    const infosStyle = window.getComputedStyle(infos);
    const stateStyle = window.getComputedStyle(state);
    const titleStyle = window.getComputedStyle(title);
    return {
      avatarHeight: Math.round(avatar.getBoundingClientRect().height),
      avatarWidth: Math.round(avatar.getBoundingClientRect().width),
      infosColor: infosStyle.color,
      infosFontSize: infosStyle.fontSize,
      itemBorderBottom: itemStyle.borderBottomWidth,
      itemDisplay: itemStyle.display,
      itemMinHeight: itemStyle.minHeight,
      itemPadding: itemStyle.padding,
      itemWidth: Math.round(item.getBoundingClientRect().width),
      postIdText: postId.textContent?.trim(),
      progressHeight: Math.round(progress.getBoundingClientRect().height),
      progressWidth: Math.round(progress.getBoundingClientRect().width),
      stateBackground: stateStyle.backgroundColor,
      stateBorderRadius: stateStyle.borderRadius,
      statePadding: stateStyle.padding,
      titleFontSize: titleStyle.fontSize,
      titleText: title.textContent?.trim(),
      titleWrapMarginLeft: window.getComputedStyle(titleWrap).marginLeft,
    };
  });
}

async function pullRequestTwoColumnMetrics(page: Page) {
  return page.locator(".project-page-wrap").evaluate((wrap) => {
    const leftMenu = wrap.querySelector<HTMLElement>(".left-menu.search-wrap");
    const row = wrap.querySelector<HTMLElement>(".post-list-wrap .post-item");
    const toggle = wrap.querySelector<HTMLInputElement>("#two-column-mode");
    const missing = Object.entries({ leftMenu, row, toggle })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected PR two-column metric targets are missing: ${missing.join(", ")}`);
    }

    return {
      leftMenuDisplay: window.getComputedStyle(leftMenu).display,
      rowCursor: window.getComputedStyle(row).cursor,
      toggleChecked: toggle.checked,
    };
  });
}

async function pullRequestTwoColumnPopoverMetrics(page: Page) {
  return page.locator("#two-column-mode-checkbox").evaluate((wrapper) => {
    const popover = wrapper.querySelector<HTMLElement>(".popover");
    const arrow = wrapper.querySelector<HTMLElement>(".popover .arrow");
    const title = wrapper.querySelector<HTMLElement>(".popover-title");
    const content = wrapper.querySelector<HTMLElement>(".popover-content");
    const toggle = wrapper.querySelector<HTMLInputElement>("#two-column-mode");
    const missing = Object.entries({ arrow, content, popover, title, toggle })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected PR two-column popover targets are missing: ${missing.join(", ")}`);
    }

    const popoverBox = popover.getBoundingClientRect();
    const toggleBox = toggle.getBoundingClientRect();
    return {
      contentText: content.textContent?.trim(),
      hasArrow: Boolean(arrow),
      placementClass: popover.classList.contains("top"),
      popoverBottomIsAboveToggleBottom: popoverBox.bottom <= toggleBox.bottom,
      role: popover.getAttribute("role"),
      titleText: title.textContent?.trim(),
    };
  });
}

async function pullRequestSearchMetrics(page: Page) {
  return page.locator("#search").evaluate((form) => {
    const leftMenu = form.closest<HTMLElement>(".left-menu.search-wrap");
    const search = form.querySelector<HTMLElement>(".search");
    const searchBar = form.querySelector<HTMLElement>(".search-bar");
    const input = form.querySelector<HTMLInputElement>('input[name="filter"]');
    const button = form.querySelector<HTMLElement>(".search-btn");
    const advanced = form.querySelector<HTMLElement>("#advanced-search-form");
    const select = form.querySelector<HTMLSelectElement>("#contributors");
    const missing = Object.entries({ advanced, button, input, leftMenu, search, searchBar, select })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected PR search metric targets are missing: ${missing.join(", ")}`);
    }

    const advancedStyle = window.getComputedStyle(advanced);
    const inputStyle = window.getComputedStyle(input);
    const leftMenuStyle = window.getComputedStyle(leftMenu);
    return {
      advancedMarginTop: advancedStyle.marginTop,
      buttonHeight: Math.round(button.getBoundingClientRect().height),
      buttonWidth: Math.round(button.getBoundingClientRect().width),
      formAction: form.getAttribute("action"),
      inputHeight: Math.round(input.getBoundingClientRect().height),
      inputPadding: inputStyle.padding,
      inputValue: input.value,
      leftMenuPaddingTop: leftMenuStyle.paddingTop,
      leftMenuWidth: Math.round(leftMenu.getBoundingClientRect().width),
      searchBarDisplay: window.getComputedStyle(searchBar).display,
      searchMargin: window.getComputedStyle(search).margin,
      selectedContributor: select.value,
    };
  });
}

async function pullRequestHeaderSearchScopeMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const form = document.querySelector<HTMLFormElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const searchBox = form?.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
    const input = form?.querySelector<HTMLInputElement>('input[name="keyword"]');
    const missing = Object.entries({ form, header, input, scope, searchBox })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected PR header search scope targets are missing: ${missing.join(", ")}`);
    }

    const rect = (element: HTMLElement) => {
      const { bottom, left, right, top } = element.getBoundingClientRect();
      return { bottom, left, right, top };
    };

    return {
      formAction: form.getAttribute("action"),
      form: rect(form),
      header: rect(header),
      input: rect(input),
      scope: rect(scope),
      searchBox: rect(searchBox),
    };
  });
}

async function pullRequestBadRequestMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const message = errorWrap?.querySelector<HTMLElement>("p");
    const homeButton = errorWrap?.querySelector<HTMLElement>("a.ybtn.ybtn-info");
    const missing = Object.entries({ errorWrap, header, homeButton, message, pageWrap })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected PR bad-request metric targets are missing: ${missing.join(", ")}`);
    }

    return {
      errorTextAlign: window.getComputedStyle(errorWrap).textAlign,
      gnbBackground: window.getComputedStyle(header).backgroundColor,
      gnbClassName: header.className,
      homeButtonClassName: homeButton.className,
      messageColor: window.getComputedStyle(message).color,
      messageFontSize: window.getComputedStyle(message).fontSize,
      pageWrapMarginTop: window.getComputedStyle(pageWrap).marginTop,
      pageWrapMinHeight: window.getComputedStyle(pageWrap).minHeight,
    };
  });
}
