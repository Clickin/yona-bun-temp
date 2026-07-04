import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const PROJECT_PULLREQUESTS_ROUTE_SOURCE = readFileSync(
  "src/routes/$ownerName/$projectName/pullRequests.tsx",
  "utf8",
);

const EXPECTED_PROJECT_PULLREQUESTS_EMPTY = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><a href="javascript:void(0);" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></a></li><li class="gnb-usermenu-dropdown"><a href="javascript:void(0);" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></a><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class="active"><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div pjax-container="" class="row-fluid cb"><div class="left-menu span2 search-wrap hide-in-mobile" style="padding-top:0px"><form id="search" name="search" action="__BASE_PATH__/admin/sample/pullRequests" method="get"><div class="search"><div class="search-bar"><input name="filter" class="textbox full" type="text" value="empty"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></div><div id="advanced-search-form" class="srch-advanced"><dl class="issue-option"><dt>Sender</dt><dd><select id="contributors" name="contributorId" data-format="user"><option value="" selected="">All</option><option value="1">Sent by me</option><option value="1" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="admin">Site Admin</option><option value="2" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="dev">Dev Member</option></select></dd></dl></div></form></div><div class="span10 span-hard-wrap" id="span10"><div class="pull-right"><a href="__BASE_PATH__/admin/sample/newPullRequestForm" class="ybtn ybtn-success">pull request</a></div><ul class="nav nav-tabs nm pullrequeset-tab-menu"><li class="active"><a href="#" data-url="__BASE_PATH__/admin/sample/pullRequests" data-type="state">Open<span class="num-badge">0</span></a></li><li class=""><a href="#" data-url="__BASE_PATH__/admin/sample/closedPullRequests" data-type="state">Closed<span class="num-badge">0</span></a></li><li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" data-content="Splits list and body into columns respectively"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li></ul><div class="tab-content" style="clear:both;padding-top:15px"><div id="list" class="row-fluid tab-pane active"><ul class="post-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No pull requests have been received</p></div></ul></div></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

function expectedProjectPullRequestsEmpty(basePath: string) {
  return EXPECTED_PROJECT_PULLREQUESTS_EMPTY.replaceAll("__BASE_PATH__", basePath)
    .replace(
      '<li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>',
      '<li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>',
    )
    .replace(
      '<a href="' +
        basePath +
        '/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar">',
      '<a href="' + basePath + '/sites/userList" class="usermenu-icon-button show-progress-bar">',
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
    );
}

test("project pull request empty list matches legacy git/list.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=empty`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator(".error-wrap")).toHaveText("No pull requests have been received");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap #pagination")).toHaveCount(0);

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
  await expect(page.locator('.alert.alert-info a.close[href="#"]')).toHaveCount(0);
  const closeControl = page.locator(".alert.alert-info button.close");
  await expect(closeControl).toHaveAttribute("type", "button");
  await expect(closeControl).toHaveAttribute("class", "close");
  await expect(closeControl).toHaveAttribute("data-dismiss", "alert");
  await expect(closeControl).toHaveAttribute("aria-hidden", "true");
  await expect(closeControl).toHaveAttribute("data-request-method", "delete");
  await expect(closeControl).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/pushedBranch/17/delete`,
  );

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
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator(".pullrequeset-tab-menu li.active a")).toContainText("Closed");
  await expect(page.locator(".error-wrap")).toHaveText("No pull requests have been received");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap #pagination")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedClosedPullRequestsEmpty(basePath)),
  );
});

test("project sent pull request empty list matches legacy git/list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page, { isForkedFromOrigin: true });

  await page.goto(`${basePath}/admin/sample/sentPullRequests?filter=empty`);
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
});

test("project pull request populated list matches legacy git/partial_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=row`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
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
  await markPullRequestSpaSession(page);
  await reviewersLink.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequest/8#reviewers`);
  await expectPullRequestSpaSession(page);
});

test("project pull request row source uses TanStack Link for internal row navigation", () => {
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("as unknown as");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("pjaxContainer");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("legacyHref");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("<div pjax-container=");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("LegacyTitlePrefixLink");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain('data-toggle="tooltip"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain('data-placement="top"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain('data-html="true"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("data-title=");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).not.toContain("data-original-title=");
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
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("type LegacyPjaxContainerAttrs");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    'const legacyPjaxAttrs = { "pjax-container": "" } satisfies LegacyPjaxContainerAttrs',
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("<div {...legacyPjaxAttrs}");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain("type LegacyPullRequestRowAttrs");
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "const legacyPullRequestRowAttrs = { href: pullRequestHref } satisfies LegacyPullRequestRowAttrs",
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    '<li className="post-item title" {...legacyPullRequestRowAttrs}>',
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('to="/$user"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    'to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"',
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    'to="/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes"',
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "to={`/${ownerName}/${projectName}/newPullRequestForm` as never}",
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain(
    "`${projectPath}/newPullRequestForm?fromBranch=${branch.branchName}&toBranch=${branch.defaultBranch}` as never",
  );
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('className="title-prefix"');
  expect(PROJECT_PULLREQUESTS_ROUTE_SOURCE).toContain('hash="reviewers"');
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
  await page.locator("#contributors").selectOption("2");
  await expect(page).toHaveURL(
    new RegExp(`${basePath}/admin/sample/pullRequests\\?filter=empty&contributorId=2`),
  );
  await expectPullRequestSpaSession(page);
  expect(await pullRequestSearchMetrics(page)).toEqual({
    advancedMarginTop: "10px",
    buttonHeight: 20,
    buttonWidth: 38,
    formAction: `${basePath}/admin/sample/pullRequests`,
    inputHeight: 30,
    inputPadding: "0px 5px",
    inputValue: "empty",
    leftMenuPaddingTop: "0px",
    leftMenuWidth: 188,
    searchBarDisplay: "block",
    searchMargin: "0px",
    selectedContributor: "2",
  });
});

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

test("project pull request multi-page list matches legacy pagination DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectPullRequests(page);

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=pages&pageNum=1`);
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#pagination")).toHaveClass("page-navigation-wrap");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveAttribute("max", "2");
  await expect(page.locator("#pagination a").filter({ hasText: "NEXT" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequests?filter=pages&pageNum=2`,
  );

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, expectedPagedPullRequests(basePath)),
  );
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
      '<div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="' +
        basePath +
        '/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="' +
        basePath +
        '/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div>',
      '<div class="project-breadcrumb-wrap fork"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="' +
        basePath +
        '/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="' +
        basePath +
        '/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div><div class="project-origin"><span class="project-origin-title">Forked from</span><a href="' +
        basePath +
        '/origin/upstream" class="project-origin-name">origin/upstream</a></div></div>',
    )
    .replace(
      '<div id="advanced-search-form" class="srch-advanced"><dl class="issue-option"><dt>Sender</dt><dd><select id="contributors" name="contributorId" data-format="user"><option value="" selected="">All</option><option value="1">Sent by me</option><option value="1" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="admin">Site Admin</option><option value="2" data-avatar-url="/assets/images/default-avatar-32.png" data-login-id="dev">Dev Member</option></select></dd></dl></div>',
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
        '/admin/sample/sentPullRequests" data-type="state">Sent code<span class="num-badge">0/0</span></a></li><li><div class="two-column-icon mr10 hide-in-mobile"',
    );
  return withSentTab;
}

function expectedRecentlyPushedPullRequests(basePath: string) {
  return expectedProjectPullRequestsEmpty(basePath)
    .replace('value="empty"', 'value="pushed"')
    .replace(
      '<div class="pull-right"><a href="' +
        basePath +
        '/admin/sample/newPullRequestForm" class="ybtn ybtn-success">pull request</a></div>',
      '<h5>Recently pushed branch</h5><div class="alert alert-info"><div><i class="yobicon-split"></i><span style="margin-left:5px;font-weight:bold">admin/sample:feature/ui ( Jul 1, 2026 )</span>&nbsp;-&nbsp;<a href="' +
        basePath +
        '/admin/sample/newPullRequestForm?fromBranch=feature/ui&amp;toBranch=main">Pull request</a><button type="button" class="close" data-dismiss="alert" aria-hidden="true" data-request-method="delete" data-request-uri="' +
        basePath +
        '/admin/sample/pushedBranch/17/delete">×</button></div></div><div class="pull-right"><a href="' +
        basePath +
        '/admin/sample/newPullRequestForm" class="ybtn ybtn-success">pull request</a></div>',
    );
}

function expectedPopulatedPullRequests(basePath: string) {
  return expectedProjectPullRequestsEmpty(basePath)
    .replace('value="empty"', 'value="row"')
    .replace('<span class="num-badge">0</span>', '<span class="num-badge">1</span>')
    .replace(
      '<ul class="post-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No pull requests have been received</p></div></ul>',
      '<ul class="post-list-wrap"><li class="post-item title" href="' +
        basePath +
        '/admin/sample/pullRequest/7"><div class="span10 span-hard-wrap"><a href="' +
        basePath +
        '/dev" class="avatar-wrap mlarge" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png"></a><div class="title-wrap"><span class="post-id">7</span><a href="javascript:void(0)" class="title-prefix">[API]</a><a href="' +
        basePath +
        '/admin/sample/pullRequest/7" class="title ">Restore PR rows</a></div><div class="infos"><a href="' +
        basePath +
        '/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><div class="infos-item" style="margin-right:10px"><i class="infos-icon yobicon-post2 vmiddle"></i><div class="upload-progress"><div class="bar orange" style="width:50%"></div></div><a href="' +
        basePath +
        '/admin/sample/pullRequest/7/changes" data-toggle="tooltip" title="Closed review / Total review"><span>1</span><span class="gray-txt">/</span><span class="size total">2</span></a></div><span class="to-default-branch">main</span></div></div><div class="span2 hide-in-mobile"><div class="mt5 pull-right hide-in-mobile"><a href="' +
        basePath +
        '/admin" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Site Admin" data-original-title="Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li><div id="pagination"></div></ul>',
    );
}

function expectedReviewerPullRequests(basePath: string) {
  return expectedProjectPullRequestsEmpty(basePath)
    .replace('value="empty"', 'value="reviewer"')
    .replace('<span class="num-badge">0</span>', '<span class="num-badge">1</span>')
    .replace(
      '<ul class="post-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No pull requests have been received</p></div></ul>',
      '<ul class="post-list-wrap"><li class="post-item title" href="' +
        basePath +
        '/admin/sample/pullRequest/8"><div class="span10 span-hard-wrap"><a href="' +
        basePath +
        '/dev" class="avatar-wrap mlarge" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png"></a><div class="title-wrap"><span class="post-id">8</span><a href="' +
        basePath +
        '/admin/sample/pullRequest/8" class="title ">Require reviewer count</a></div><div class="infos"><a href="' +
        basePath +
        '/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><div class="infos-item over" style="margin-top:-1px"><i class="infos-icon yobicon-preview vmiddle"></i><a href="' +
        basePath +
        '/admin/sample/pullRequest/8#reviewers" data-toggle="tooltip" data-html="true" data-title="Site Admin<br>Dev Member" title="Site Admin, Dev Member"><span class="vmiddle">2</span></a></div><span class="to-default-branch">main</span></div></div><div class="span2 hide-in-mobile"><div class="mt5 pull-right hide-in-mobile"><a href="' +
        basePath +
        '/admin" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Site Admin" data-original-title="Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li><div id="pagination"></div></ul>',
    );
}

function expectedConflictPullRequests(basePath: string) {
  return expectedProjectPullRequestsEmpty(basePath)
    .replace('value="empty"', 'value="conflict"')
    .replace('<span class="num-badge">0</span>', '<span class="num-badge">1</span>')
    .replace(
      '<ul class="post-list-wrap"><div class="error-wrap"><i class="ico ico-err1"></i><p>No pull requests have been received</p></div></ul>',
      '<ul class="post-list-wrap"><li class="post-item title" href="' +
        basePath +
        '/admin/sample/pullRequest/9"><div class="span10 span-hard-wrap"><a href="' +
        basePath +
        '/dev" class="avatar-wrap mlarge" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png"></a><div class="title-wrap"><span class="post-id">9</span><a href="' +
        basePath +
        '/admin/sample/pullRequest/9" class="title conflict">Resolve release branch</a></div><div class="infos"><a href="' +
        basePath +
        '/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><span class="to-branch">release/1.0</span></div></div><div class="span2 hide-in-mobile"><div class="mt5 pull-right hide-in-mobile"><a href="' +
        basePath +
        '/admin" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Site Admin" data-original-title="Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state conflict pull-right">Conflict</div></div></li><div id="pagination"></div></ul>',
    );
}

function expectedPagedPullRequests(basePath: string) {
  return expectedPopulatedPullRequests(basePath)
    .replace('value="row"', 'value="pages"')
    .replace('<span class="num-badge">1</span>', '<span class="num-badge">2</span>')
    .replace(
      '<div id="pagination"></div>',
      '<div id="pagination" class="page-navigation-wrap"><ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">PREV</span></li><li class="page-num"><input class="input-mini nospinner" max="2" min="1" name="pageNum" pattern="[0-9]*" readonly="" type="number" value="1"></li><li class="page-num delimiter">/</li><li class="page-num">2</li><li class="page-num ikon"><a href="' +
        basePath +
        '/admin/sample/pullRequests?filter=pages&amp;pageNum=2"><span>NEXT</span><i class="ico btn-pg-next"></i></a></li></ul></div>',
    );
}

async function mockProjectPullRequests(page: Page, options: { isForkedFromOrigin?: boolean } = {}) {
  const pushedBranchDeleteRequests: { hasCsrfToken: boolean; method: string; url: string }[] = [];
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
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
        closedCount: 0,
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
        openCount: filter === "pages" ? 2 : items.length,
        pageNum: 1,
        pageSize: filter === "pages" ? 1 : 15,
        recentlyPushedBranches,
        sentCount: 0,
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

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, .page-footer-outer",
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
            attr.name !== "alt",
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

    function normalizeAttr(attr: Attr) {
      if (isModernizedTanStackRouterHref(attr)) {
        return "#";
      }
      if (isModernizedSiteLogoHref(attr)) {
        return attr.value.replace(/\/$/u, "");
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
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
            attr.name !== "alt",
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

    function normalizeAttr(attr: Attr) {
      if (isModernizedTanStackRouterHref(attr)) {
        return "#";
      }
      if (isModernizedSiteLogoHref(attr)) {
        return attr.value.replace(/\/$/u, "");
      }
      if (isModernizedTanStackRouterActiveClass(attr)) {
        return modernizedTanStackRouterActiveClass(attr);
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
