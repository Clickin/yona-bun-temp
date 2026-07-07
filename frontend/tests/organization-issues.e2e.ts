import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const ORGANIZATION_ISSUES_ROUTE_SOURCE = new URL(
  "../src/routes/organizations/$organizationName/issues.tsx",
  import.meta.url,
);

const EXPECTED_ORGANIZATION_ISSUES = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer project-header"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li><li class="divider"></li><li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li><li><form action="__BASE_PATH__/organizations/weblabs/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Group</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li><li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/group_default.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/group_default.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author"><span class="group-title-head">group</span><a href="__BASE_PATH__/organizations/weblabs">weblabs</a></span></div></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/organizations/weblabs">Group Home</a></li><li class="active"><a href="__BASE_PATH__/organizations/weblabs/issues">Issue</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/boards">Board</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/pullrequests">Pull request</a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform"><i class="yobicon-cog"></i><span class="blind">Project configuration</span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="page-wrap"><div pjax-container="" class="row-fluid issue-list-wrap"><div class="left-menu span2 span-hard-wrap"><div class="inner advanced"><ul class="lst-stacked unstyled"><li class="active"><button pjax-filter="" type="button" data-assignee-id="" data-author-id="" data-mention-id="" data-project-names="" data-milestone-id="">All issues</button></li><li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="1" data-project-names="" data-milestone-id="" data-mention-id="">Assigned</button></li><li class=""><button pjax-filter="" type="button" data-author-id="1" data-assignee-id="" data-milestone-id="" data-project-names="" data-mention-id="">Created</button></li><li class=""><button pjax-filter="" type="button" data-author-id="" data-assignee-id="" data-milestone-id="" data-project-names="" data-mention-id="1">Mentioned</button></li></ul><form id="search" name="search" action="__BASE_PATH__/organizations/weblabs/issues" method="get"><select id="projects" name="projectNames[]" multiple="" data-placeholder="Choose projects" data-toggle="select2" data-container-css-class="fullsize" style="width:100%"><option value="sample" data-avatar-url="/assets/images/project_default_logo.png">sample</option><option value="playground" data-avatar-url="/assets/images/project_default_logo.png">playground</option></select><hr><input type="hidden" name="orderBy" value="createdDate"><input type="hidden" name="orderDir" value="desc"><input type="hidden" name="state" value="open"><input type="hidden" name="authorId" value="" data-search="authorId"><input type="hidden" name="assigneeId" value="" data-search="assigneeId"><input type="hidden" name="mentionId" value="" data-search="mentionId"><div class="search"><div class="search-bar"><input name="filter" class="textbox full" type="text" value="bug"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></div></form></div></div><div class="span10 span-hard-wrap" id="span10"><ul class="nav nav-tabs nm"><li class="active"><button type="button" state="open">Open<span class="num-badge">1</span></button></li><li class=""><button type="button" state="closed">Closed<span class="num-badge">2</span></button></li><li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" data-content="Splits list and body into columns respectively"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li></ul><ul class="post-list-wrap"><li class="post-item title" id="issue-item-42" href="__BASE_PATH__/weblabs/sample/issue/11"><div class="span10 span-hard-wrap"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge hide-in-mobile" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png"></a><div class="title-wrap"><a href="__BASE_PATH__/weblabs/sample/issue/11" class="title">Fix flaky issue</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><span class="infos-item mileston-tag"><a href="__BASE_PATH__/weblabs/sample/milestone/5" data-toggle="tooltip" data-placement="top" title="Milestone">v1.0</a></span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/weblabs/sample/issue/11#comments"><span class="count-groups item-icon "><i class="yobicon-comments"></i></span><span class="count-groups item-count ">3</span></a><a href="__BASE_PATH__/weblabs/sample/issue/11#vote"><span class="count-groups item-icon strong"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a></span><a href="__BASE_PATH__/weblabs/sample" class="infos-link-item group-project-name">sample</a><span class="post-id margin-right-5">#11</span><a href="__BASE_PATH__/weblabs/sample/issues?state=open&amp;labelIds=8" class="label issue-label list-label" data-label-id="8" style="background:rgb(81,170,204)">bug</a></div></div><div class="span2 hide-in-mobile"><div class="mt5 pull-right"><a href="__BASE_PATH__/admin" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Assignee: Site Admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="mr20 mt10 pull-right overdue" data-toggle="tooltip" data-placement="top" title="Jun 30, 2026"><i class="yobicon-clock2"></i>Overdue</div></div></li></ul><div id="pagination" class="page-navigation-wrap" data-total="3"><ul class="page-nums"><li class="page-num ikon"><i class="ico btn-pg-prev off"></i><span class="off">Previous page</span></li><li class="page-num"><input type="number" pattern="[0-9]*" class="input-mini nospinner" name="pageNum" max="3" min="1" value="1"></li><li class="page-num delimiter">/</li><li class="page-num">3</li><li class="page-num ikon"><a href="__BASE_PATH__/organizations/weblabs/issues?filter=bug&amp;orderBy=createdDate&amp;orderDir=desc&amp;pageNum=2&amp;state=open"><span>Next page</span><i class="ico btn-pg-next"></i></a></li></ul></div></div></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("organization issue aggregate matches legacy group_issue_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page);

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  await expect(page).toHaveTitle("weblabs");
  await expect.poll(() => firstHeadTitleText(page)).toBe("weblabs");
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveText("weblabs");
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs`,
  );
  await expect(page.locator(".project-breadcrumb .project-author a")).not.toHaveAttribute(
    "aria-current",
  );
  await expect(page.locator(".project-breadcrumb .project-author a")).not.toHaveAttribute(
    "data-status",
  );
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Issue");
  await expect(page.locator(".project-menu-gruop > li")).toHaveClass(["", "active", "", ""]);
  expect(await hrefs(page, ".project-menu-gruop > li > a")).toEqual([
    `${basePath}/organizations/weblabs`,
    `${basePath}/organizations/weblabs/issues`,
    `${basePath}/organizations/weblabs/boards`,
    `${basePath}/organizations/weblabs/pullrequests`,
  ]);
  expect(await attributes(page, ".project-menu-gruop > li > a", "data-status")).toEqual([
    null,
    null,
    null,
    null,
  ]);
  await expect(page.locator(".project-setting .project-menu-nav > li > a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );
  await expect(page.locator(".project-setting .project-menu-nav > li > a")).not.toHaveAttribute(
    "data-status",
  );
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#issue-item-42")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issue/11`,
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.mlarge")).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator("#issue-item-42 .title-wrap .title")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issue/11`,
  );
  await expect(page.locator("#issue-item-42 .infos > .infos-link-item").first()).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(page.locator("#issue-item-42 .mileston-tag a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/milestone/5`,
  );
  await expect(page.locator("#issue-item-42 .item-count-groups a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issue/11#comments`,
  );
  await expect(page.locator("#issue-item-42 .item-count-groups a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issue/11#vote`,
  );
  await expect(page.locator("#issue-item-42 .group-project-name")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample`,
  );
  await expect(page.locator('a.issue-label[data-label-id="8"]')).toHaveText("bug");
  await expect(page.locator('a.issue-label[data-label-id="8"]')).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/issues?state=open&labelIds=8`,
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator("#issue-item-42 .avatar-wrap.assinee img")).toHaveAttribute(
    "alt",
    "Site Admin",
  );
  await expect(page.locator('.lst-stacked [pjax-filter][data-assignee-id="1"]')).toHaveText(
    "Assigned",
  );
  await expect(page.locator('.lst-stacked button[pjax-filter][type="button"]')).toHaveCount(4);
  await expect(page.locator('.lst-stacked a[href="#"][pjax-filter]')).toHaveCount(0);
  await expect(page.locator('.lst-stacked [pjax-filter][data-assignee-id="1"]')).toHaveAttribute(
    "data-milestone-id",
    "",
  );
  await expect(page.locator('.lst-stacked [pjax-filter][data-author-id="1"]')).toHaveText(
    "Created",
  );
  await expect(page.locator('.lst-stacked [pjax-filter][data-mention-id="1"]')).toHaveText(
    "Mentioned",
  );
  await expect(page.locator('.nav-tabs.nm > li > button[state][type="button"]')).toHaveCount(2);
  await expect(page.locator('.nav-tabs.nm > li > a[href="#"][state]')).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_ORGANIZATION_ISSUES.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("organization issues project selector submits legacy search state through React navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mock = await mockOrganizationIssues(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    `${basePath}/organizations/weblabs/issues?state=open&filter=bug&pageNum=3&orderBy=createdDate&orderDir=desc`,
  );

  const projects = page.locator("#search > select#projects");
  await expect(page.locator("#search")).toBeVisible();
  await expect(projects).toHaveAttribute("name", "projectNames[]");
  await expect(projects).toHaveAttribute("multiple", "");
  await expect(projects).toHaveAttribute("data-placeholder", "Choose projects");
  await expect(projects).toHaveAttribute("data-toggle", "select2");
  await expect(projects).toHaveAttribute("data-container-css-class", "fullsize");
  await expect(projects.locator("option")).toHaveText(["sample", "playground"]);
  await expect(projects.locator("option").nth(0)).toHaveAttribute("value", "sample");
  await expect(projects.locator("option").nth(1)).toHaveAttribute("value", "playground");

  expect(
    await page.locator("#search").evaluate((form) =>
      Array.from(form.children).map((child) => {
        if (!(child instanceof HTMLElement)) {
          return child.tagName.toLowerCase();
        }
        return (
          child.id || child.getAttribute("name") || child.className || child.tagName.toLowerCase()
        );
      }),
    ),
  ).toEqual([
    "projects",
    "hr",
    "orderBy",
    "orderDir",
    "state",
    "authorId",
    "assigneeId",
    "mentionId",
    "search",
  ]);
  await expect(page.locator(".lst-stacked > li")).toHaveText([
    "All issues",
    "Assigned",
    "Created",
    "Mentioned",
  ]);
  await expect(page.locator("#span10 > .nav-tabs.nm > li").nth(0)).toContainText("Open1");
  await expect(page.locator("#span10 > .nav-tabs.nm > li").nth(1)).toContainText("Closed2");
  await expect(page.locator('#search input[name="filter"]')).toHaveValue("bug");
  await expect(page.locator("#search .search-bar .search-btn .yobicon-search")).toHaveCount(1);

  const issueRequestCountBeforeSelect = mock.issueRequestUrls.length;
  await projects.selectOption(["sample"]);
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({
      filter: "bug",
      orderBy: "createdDate",
      orderDir: "desc",
      pageNum: "1",
      projectNames: "sample",
      state: "open",
    });
  await expect
    .poll(() => mock.issueRequestUrls.length)
    .toBeGreaterThan(issueRequestCountBeforeSelect);
  expect(mock.issueRequestUrls.at(-1)).toContain("projectNames=sample");

  // Live legacy rendering is not available in this harness; these are Scala HTML/LESS-derived
  // containment metrics, not a claim of screenshot-level visual parity.
  const boxes = await page.evaluate(() => {
    const selectors = {
      header: ".project-header-outer",
      leftMenu: ".issue-list-wrap > .left-menu",
      list: ".post-list-wrap",
      menu: ".project-menu-outer",
      pageWrap: ".page-wrap",
      projects: "#projects",
      searchBar: "#search .search-bar",
      searchForm: "#search",
      span10: "#span10",
      tabs: "#span10 > .nav-tabs.nm",
    } as const;
    return Object.fromEntries(
      Object.entries(selectors).map(([name, selector]) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) {
          throw new Error(`Missing ${selector}`);
        }
        const rect = element.getBoundingClientRect();
        return [
          name,
          {
            bottom: rect.bottom,
            height: rect.height,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width,
          },
        ];
      }),
    );
  });

  expect(boxes.header.bottom).toBeLessThanOrEqual(boxes.menu.top + 1);
  expect(boxes.menu.bottom).toBeLessThanOrEqual(boxes.pageWrap.top);
  expect(boxes.leftMenu.left).toBeGreaterThanOrEqual(boxes.pageWrap.left);
  expect(boxes.span10.right).toBeLessThanOrEqual(boxes.pageWrap.right + 1);
  expect(boxes.leftMenu.right).toBeLessThanOrEqual(boxes.span10.left + 1);
  expect(boxes.searchForm.left).toBeGreaterThanOrEqual(boxes.leftMenu.left);
  expect(boxes.searchForm.right).toBeLessThanOrEqual(boxes.leftMenu.right + 1);
  expect(boxes.projects.left).toBeGreaterThanOrEqual(boxes.searchForm.left);
  expect(boxes.projects.right).toBeLessThanOrEqual(boxes.searchForm.right + 1);
  expect(boxes.projects.bottom).toBeLessThanOrEqual(boxes.searchBar.top);
  expect(boxes.tabs.left).toBeGreaterThanOrEqual(boxes.span10.left);
  expect(boxes.tabs.right).toBeLessThanOrEqual(boxes.span10.right + 1);
  expect(boxes.list.left).toBeGreaterThanOrEqual(boxes.span10.left);
  expect(boxes.list.right).toBeLessThanOrEqual(boxes.span10.right + 1);
  expect(boxes.tabs.bottom).toBeLessThanOrEqual(boxes.list.top);
});

test("organization issue aggregate pins the live localhost guest shell title and scope branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page, { isAnonymous: true, viewerCanUpdate: false });

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);

  await expect(page).toHaveTitle("weblabs");
  await expect.poll(() => firstHeadTitleText(page)).toBe("weblabs");
  await expect(page.locator("header.gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator(".gnb-nav > li > a")).toHaveText(["Y", "List All", "Feedback"]);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page.locator(".gnb-usermenu")).toContainText("Log in");
  await expect(page.locator(".gnb-usermenu")).toContainText("Sign up");
  await expect(page.locator(".project-setting a")).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop > li")).toHaveText([
    "Group Home",
    "Issue",
    "Board",
    "Pull request",
  ]);

  const metrics = await page.evaluate(() => {
    const navbar = document.querySelector("header.gnb-outer");
    const scopeButton = document.querySelector("#gnb-search-scope-title");
    const searchBox = document.querySelector(".gnb-search-form .search-box");
    if (!(navbar instanceof HTMLElement)) {
      throw new Error("Missing header.gnb-outer");
    }
    if (!(scopeButton instanceof HTMLElement)) {
      throw new Error("Missing #gnb-search-scope-title");
    }
    if (!(searchBox instanceof HTMLElement)) {
      throw new Error("Missing .gnb-search-form .search-box");
    }
    return {
      navbar: navbar.getBoundingClientRect(),
      scopeButton: scopeButton.getBoundingClientRect(),
      searchBox: searchBox.getBoundingClientRect(),
    };
  });

  expect(metrics.scopeButton.top).toBeGreaterThanOrEqual(metrics.navbar.top);
  expect(metrics.scopeButton.bottom).toBeLessThanOrEqual(metrics.navbar.bottom);
  expect(metrics.searchBox.top).toBeGreaterThanOrEqual(metrics.navbar.top);
  expect(metrics.searchBox.bottom).toBeLessThanOrEqual(metrics.navbar.bottom);
  expect(metrics.searchBox.right).toBeLessThanOrEqual(metrics.navbar.right);

  await page.locator("#gnb-search-scope-title").click();
  await expect(page.locator(".gnb-search-form .dropdown-menu button")).toHaveText(["All Projects"]);
});

test("organization issue row converted links keep SPA marker for detail and hash navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page);

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "detail";
  });
  await page.locator("#issue-item-42 .title-wrap .title").click();
  await expect
    .poll(() => windowPath(page))
    .toEqual({
      hash: "",
      pathname: `${basePath}/weblabs/sample/issue/11`,
    });
  await expect.poll(() => spaMarker(page)).toBe("detail");

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "comments";
  });
  await page.locator("#issue-item-42 .item-count-groups a").first().click();
  await expect
    .poll(() => windowPath(page))
    .toEqual({
      hash: "#comments",
      pathname: `${basePath}/weblabs/sample/issue/11`,
    });
  await expect.poll(() => spaMarker(page)).toBe("comments");
});

test("organization issue aggregate renders legacy pagination links and input behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page);

  await page.goto(
    `${basePath}/organizations/weblabs/issues?state=open&filter=bug&pageNum=1&labelIds=8`,
  );

  const pagination = page.locator("#pagination");
  await expect(pagination).toHaveClass("page-navigation-wrap");
  await expect(pagination).toHaveAttribute("data-total", "3");
  await expect(pagination.locator("ul.page-nums > li.page-num")).toHaveCount(5);
  await expect(pagination.locator("li.page-num.ikon").first()).toContainText("Previous page");
  await expect(pagination.locator("li.page-num.ikon").first().locator("a")).toHaveCount(0);
  await expect(pagination.locator(".btn-pg-prev")).toHaveClass(/off/);

  const input = pagination.locator('input[name="pageNum"]');
  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveAttribute("pattern", "[0-9]*");
  await expect(input).toHaveAttribute("min", "1");
  await expect(input).toHaveAttribute("max", "3");
  await expect(input).toHaveValue("1");
  await expect(pagination.locator(".delimiter")).toHaveText("/");
  await expect(pagination.locator("li.page-num").nth(3)).toHaveText("3");

  const nextPageLink = pagination.locator("a").filter({ hasText: "Next page" });
  await expect(nextPageLink).toHaveAttribute("href", /pageNum=2/);
  await expect(nextPageLink).toHaveAttribute("href", /filter=bug/);
  await expect(nextPageLink).toHaveAttribute("href", /state=open/);
  await expect(nextPageLink).toHaveAttribute("href", /labelIds=8/);
  await expect(nextPageLink).not.toHaveAttribute("aria-current");
  await expect(nextPageLink).not.toHaveAttribute("data-status");
  await expect(nextPageLink.locator(".btn-pg-next")).not.toHaveClass(/off/);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pagination";
  });
  await nextPageLink.click();
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ filter: "bug", labelIds: "8", pageNum: "2", state: "open" });
  await expect.poll(() => spaMarker(page)).toBe("pagination");
  const previousPageLink = pagination.locator("a").filter({ hasText: "Previous page" });
  await expect(previousPageLink).toHaveAttribute("href", /pageNum=1/);
  await expect(previousPageLink).not.toHaveAttribute("aria-current");
  await expect(previousPageLink).not.toHaveAttribute("data-status");

  await input.fill("9");
  await input.press("Enter");
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ labelIds: "8", pageNum: "3" });
  await expect(input).toHaveValue("3");

  await input.evaluate((element) => {
    (element as HTMLInputElement).value = "not-a-page";
  });
  await input.press("Enter");
  await expect(input).toHaveValue("3");
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ labelIds: "8", pageNum: "3" });
});

test("organization issue row source uses Link for internal row anchors", () => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  expect(source).not.toContain("as unknown as");
  expect(source).not.toContain("pjaxContainer");
  expect(source).not.toContain("legacyHref");
  expect(source).not.toContain("rowAttributes");
  expect(source).not.toContain("const projectHref");
  expect(source).not.toContain("const authorHref");
  expect(source).not.toContain("const assigneeHref");
  expect(source).not.toContain("href={`${projectHref}");
  expect(source).not.toContain("href={authorHref}");
  expect(source).not.toContain("href={assigneeHref}");
  expect(source).toContain('hash="comments"');
  expect(source).toContain('hash="vote"');
  expect(source).toContain("to={projectRoutePath}");
  expect(source).toContain("to={authorRoutePath}");
  expect(source).toContain("to={assigneeRoutePath}");
});

test("organization issues top menu source uses direct Link targets", () => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  expect(source).not.toContain("<a ");
  expect(source).not.toContain("organizationHref(");
  expect(source).not.toContain("OrganizationRouteLink");
  expect(source).toContain("function OrganizationHeader");
  expect(source).toContain("to={`/organizations/${organizationName}`}");
  expect(source).toContain("to={`/organizations/${organizationName}/issues`}");
  expect(source).toContain("to={`/organizations/${organizationName}/boards`}");
  expect(source).toContain("to={`/organizations/${organizationName}/pullrequests`}");
  expect(source).toContain("to={`/organizations/${organizationName}/settingform`}");
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain('"data-status": undefined');
});

test("organization issues source renders legacy browser title without document mutation", () => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  expect(source).toContain("<title>{organizationName}</title>");
  expect(source).toContain("onChange={handleProjectsChange}");
  expect(source).toContain("onSubmit={handleSearchSubmit}");
  expect(source).not.toMatch(/\bdocument\.title\b/u);
  expect(source).not.toMatch(/\b(?:globalThis|window)\.document\.title\b/u);
  expect(source).not.toContain("htmlDocument.title");
});

test("organization issue aggregate filter controls are React buttons with legacy search evidence", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page, { itemCount: 2 });

  await page.goto(
    `${basePath}/organizations/weblabs/issues?state=open&filter=bug&pageNum=3&orderBy=createdDate&orderDir=desc`,
  );
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const quickButtons = page.locator('.lst-stacked button[pjax-filter][type="button"]');
  await expect(quickButtons).toHaveCount(4);
  await expect(page.locator('.lst-stacked a[href="#"][pjax-filter]')).toHaveCount(0);
  await expect(quickButtons.nth(0)).toHaveAttribute("data-assignee-id", "");
  await expect(quickButtons.nth(1)).toHaveAttribute("data-assignee-id", "1");
  await expect(quickButtons.nth(2)).toHaveAttribute("data-author-id", "1");
  await expect(quickButtons.nth(3)).toHaveAttribute("data-mention-id", "1");

  const stateButtons = page.locator(".nav-tabs.nm > li > button[state]");
  await expect(stateButtons).toHaveCount(2);
  await expect(stateButtons.nth(0)).toHaveAttribute("type", "button");
  await expect(stateButtons.nth(0)).toHaveAttribute("state", "open");
  await expect(stateButtons.nth(1)).toHaveAttribute("state", "closed");
  await expect(page.locator('.nav-tabs.nm > li > a[href="#"][state]')).toHaveCount(0);

  const sortButtons = page.locator(".filter-wrap .filters button.filter");
  await expect(sortButtons).toHaveCount(4);
  await expect(page.locator('.filter-wrap .filters a[href="#"].filter')).toHaveCount(0);
  await expect(sortButtons.nth(0)).toHaveAttribute("orderby", "dueDate");
  await expect(sortButtons.nth(0)).toHaveAttribute("orderdir", "desc");
  await expect(sortButtons.nth(2)).toHaveClass(/active/);
  await expect(sortButtons.nth(2)).toHaveAttribute("orderby", "createdDate");
  await expect(sortButtons.nth(2)).toHaveAttribute("orderdir", "asc");
  await expect(sortButtons.nth(2).locator("i")).toHaveClass(/down/);

  await quickButtons.nth(1).click();
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ assigneeId: "1", filter: "bug", pageNum: "1", state: "open" });
  await expect(page.locator('input[name="assigneeId"]')).toHaveValue("1");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await stateButtons.nth(1).click();
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ assigneeId: "1", filter: "bug", pageNum: "1", state: "closed" });
  await expect(page.locator('input[name="state"]')).toHaveValue("closed");

  await sortButtons.nth(0).click();
  await expect
    .poll(() => currentOrganizationIssueSearch(page))
    .toMatchObject({ orderBy: "dueDate", orderDir: "desc", pageNum: "1", state: "closed" });
  await expect(page.locator('input[name="orderBy"]')).toHaveValue("dueDate");
  await expect(page.locator('input[name="orderDir"]')).toHaveValue("desc");
});

test("organization issue aggregate hides user quick filters for anonymous users", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationIssues(page, { isAnonymous: true });

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  await expect(page.locator(".lst-stacked > li")).toHaveCount(1);
  await expect(page.locator(".lst-stacked > li")).toHaveClass("active");
  await expect(page.locator('.lst-stacked button[pjax-filter][type="button"]')).toHaveText(
    "All issues",
  );
  await expect(page.locator('.lst-stacked [data-assignee-id="1"]')).toHaveCount(0);
  await expect(page.locator('.lst-stacked [data-author-id="1"]')).toHaveCount(0);
  await expect(page.locator('.lst-stacked [data-mention-id="1"]')).toHaveCount(0);
});

test("organization issue aggregate source uses narrow legacy attr types", () => {
  const source = readFileSync(ORGANIZATION_ISSUES_ROUTE_SOURCE, "utf8");
  expect(source).not.toContain('Record<"pjax-filter", string>');
  expect(source).not.toContain('Record<"state", string>');
  expect(source).not.toContain('Record<"orderby" | "orderdir", string>');
  expect(source).not.toContain("LiHTMLAttributes");
  expect(source).not.toContain("pjaxFilter");
  expect(source).not.toContain("legacyState");
  expect(source).toContain(
    "type LegacyIssueRowAttributes = HTMLAttributes<HTMLLIElement> & { href: string };",
  );
  expect(source).toContain("type LegacyPjaxFilterAttrs");
  expect(source).toContain("type LegacyStateTabAttrs");
  expect(source).toContain("type LegacySortFilterAttrs");
  expect(source).toContain("satisfies LegacyPjaxFilterAttrs");
  expect(source).toContain("satisfies LegacyStateTabAttrs");
  expect(source).toContain("satisfies LegacySortFilterAttrs");
  expect(source).toContain("} satisfies LegacyIssueRowAttributes;");
});

test("organization issues menu board link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationIssuesMenuNativeLinkAudit(page);
  await mockOrganizationIssues(page);

  await page.goto(`${basePath}/organizations/weblabs/issues?state=open&filter=bug`);
  const boardLink = page.locator(".project-menu-gruop a").filter({ hasText: "Board" });
  await expect(boardLink).toHaveAttribute("href", `${basePath}/organizations/weblabs/boards`);
  expect(await readOrganizationIssuesMenuNativeLinkAudit(page)).toEqual([]);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await boardLink.click();

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe(`${basePath}/organizations/weblabs/boards`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Board");
  await expect(page.locator("#option_form")).toBeVisible();
  expect(await readOrganizationIssuesMenuNativeLinkAudit(page)).toEqual([]);
});

async function installOrganizationIssuesMenuNativeLinkAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__organizationIssuesMenuNativeLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithOrganizationIssuesMenuAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof HTMLAnchorElement && this.matches(".project-menu-gruop a")) {
        (
          window as Window &
            typeof globalThis & { __organizationIssuesMenuNativeLinkListeners: string[] }
        ).__organizationIssuesMenuNativeLinkListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readOrganizationIssuesMenuNativeLinkAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __organizationIssuesMenuNativeLinkListeners?: string[] }
      ).__organizationIssuesMenuNativeLinkListeners ?? [],
  );
}

async function currentOrganizationIssueSearch(page: Page) {
  return page.evaluate(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      assigneeId: params.get("assigneeId") ?? "",
      filter: params.get("filter") ?? "",
      labelIds: params.get("labelIds") ?? "",
      orderBy: params.get("orderBy") ?? "",
      orderDir: params.get("orderDir") ?? "",
      pageNum: params.get("pageNum") ?? "",
      projectNames: params.getAll("projectNames[]").join(","),
      state: params.get("state") ?? "",
    };
  });
}

async function windowPath(page: Page) {
  return page.evaluate(() => ({
    hash: window.location.hash,
    pathname: window.location.pathname,
  }));
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function firstHeadTitleText(page: Page) {
  return page.evaluate(() => document.head.querySelector("title")?.textContent ?? "");
}

async function hrefs(page: Page, selector: string) {
  return page
    .locator(selector)
    .evaluateAll((links) =>
      links.map((link) => (link instanceof HTMLAnchorElement ? link.getAttribute("href") : null)),
    );
}

async function attributes(page: Page, selector: string, name: string) {
  return page
    .locator(selector)
    .evaluateAll(
      (elements, attributeName) => elements.map((element) => element.getAttribute(attributeName)),
      name,
    );
}

async function mockOrganizationIssues(
  page: Page,
  options: { isAnonymous?: boolean; itemCount?: number; viewerCanUpdate?: boolean } = {},
) {
  const issueRequestUrls: string[] = [];
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: options.isAnonymous ? null : 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: options.isAnonymous === true,
        isConfirmed: true,
        isSiteAdmin: options.isAnonymous === true ? false : true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanUpdate: options.viewerCanUpdate ?? true,
        visibleProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/issues**", async (route) => {
    issueRequestUrls.push(route.request().url());
    const itemCount = options.itemCount ?? 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 2,
        filter: "bug",
        items: [
          {
            assigneeAvatarUrl: "/assets/images/default-avatar-32.png",
            assigneeLabel: "Site Admin",
            assigneeLoginId: "admin",
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 3,
            createdLabel: "Jul 1, 2026",
            dueDateLabel: "Jun 30, 2026",
            dueDateOverdue: true,
            dueDateText: "Overdue",
            id: 42,
            issueNumber: 11,
            labels: [{ color: "#51aacc", id: 8, name: "bug" }],
            milestoneId: 5,
            milestoneTitle: "v1.0",
            ownerName: "weblabs",
            projectName: "sample",
            state: "open",
            title: "Fix flaky issue",
            updatedLabel: "Jul 1, 2026",
            voterCount: 1,
          },
          ...(itemCount > 1
            ? [
                {
                  assigneeAvatarUrl: "",
                  assigneeLabel: "",
                  assigneeLoginId: "",
                  authorAvatarUrl: "/assets/images/default-avatar-32.png",
                  authorLabel: "Site Admin",
                  authorLoginId: "admin",
                  commentCount: 0,
                  createdLabel: "Jul 2, 2026",
                  dueDateLabel: "",
                  dueDateOverdue: false,
                  dueDateText: "",
                  id: 43,
                  issueNumber: 12,
                  labels: [],
                  milestoneId: null,
                  milestoneTitle: "",
                  ownerName: "weblabs",
                  projectName: "playground",
                  state: "open",
                  title: "Add aggregate issue row",
                  updatedLabel: "Jul 2, 2026",
                  voterCount: 0,
                },
              ]
            : []),
        ],
        openIssueCount: 1,
        orderBy: "createdDate",
        orderDir: "desc",
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        state: "open",
        totalCount: itemCount,
        totalPages: 3,
        viewerUserId: 1,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/boards**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [],
        notices: [],
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
  return { issueRequestUrls };
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  }, html);
}
