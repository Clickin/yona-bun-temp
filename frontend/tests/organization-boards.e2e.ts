import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const ORGANIZATION_BOARDS_ROUTE_SOURCE = readFileSync(
  "src/routes/organizations/$organizationName/boards.tsx",
  "utf8",
);

const EXPECTED_ORGANIZATION_BOARDS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer project-header"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li><li class="divider"></li><li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li><li><form action="__BASE_PATH__/organizations/weblabs/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Group</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li><li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/group_default.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/group_default.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author"><span class="group-title-head">group</span><a href="__BASE_PATH__/organizations/weblabs">weblabs</a></span></div></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/organizations/weblabs">Group Home</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/issues">Issue</a></li><li class="active"><a href="__BASE_PATH__/organizations/weblabs/boards">Board</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/pullrequests">Pull request</a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform"><i class="yobicon-cog"></i><span class="blind">Project configuration</span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="search-wrap underline"><form id="option_form" method="get" class="pull-left"><input type="hidden" name="orderBy" value="numOfComments"><input type="hidden" name="orderDir" value="desc"><div class="project-selects span7"><select id="projects" name="projectNames[]" data-format="projects" multiple="" data-placeholder="Choose projects" data-container-css-class="fullsize"><option value="sample" selected="">sample</option><option value="playground">playground</option></select></div><div class="search-bar span4"><input name="filter" class="textbox group-board" type="text" placeholder="Search by keyword" value="release"><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" style="position:relative"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></form></div><div class="filter-wrap board"><div class="filters"><a href="__BASE_PATH__/organizations/weblabs/boards?orderBy=updatedDate&amp;orderDir=desc" class="filter"><i class="ico btn-gray-arrow  down "></i>Updated</a><a href="__BASE_PATH__/organizations/weblabs/boards?orderBy=createdDate&amp;orderDir=desc" class="filter"><i class="ico btn-gray-arrow  down "></i>Created</a><a href="__BASE_PATH__/organizations/weblabs/boards?orderBy=numOfComments&amp;orderDir=asc" class="filter active"><i class="ico btn-gray-arrow  down "></i>Comments</a></div></div><ul class="post-list-wrap notice-wrap"><li class="post-item title" href="__BASE_PATH__/weblabs/sample/post/9"><a href="__BASE_PATH__/admin" class="avatar-wrap mlarge hide-in-mobile" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png"></a><div class="title-wrap"><a href="__BASE_PATH__/weblabs/sample/post/9" class="title">Pinned release notice</a></div><div class="infos"><a href="__BASE_PATH__/admin" class="infos-item infos-link-item" data-placement="top" title="admin">Site Admin</a><a href="__BASE_PATH__/weblabs/sample" class="infos-link-item group-project-name">sample</a><span class="post-id">#9</span><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/weblabs/sample/post/9#comments"><span class="count-groups item-icon "><i class="yobicon-comments"></i></span><span class="count-groups item-count ">1</span></a></span></div></li></ul><ul class="post-list-wrap"><li class="post-item title" href="__BASE_PATH__/weblabs/sample/post/7"><a href="__BASE_PATH__/dev" class="avatar-wrap mlarge hide-in-mobile" data-placement="top" title="dev"><img src="/assets/images/default-avatar-32.png"></a><div class="title-wrap"><a href="__BASE_PATH__/weblabs/sample/post/7" class="title">Release note</a></div><div class="infos"><a href="__BASE_PATH__/dev" class="infos-item infos-link-item" data-placement="top" title="dev">Dev Member</a><a href="__BASE_PATH__/weblabs/sample" class="infos-link-item group-project-name">sample</a><span class="post-id">#7</span><span class="infos-item" title="Jul 1, 2026">Jul 1, 2026</span><span class="infos-item item-count-groups"><a href="__BASE_PATH__/weblabs/sample/post/7#comments"><span class="count-groups item-icon "><i class="yobicon-comments"></i></span><span class="count-groups item-count ">2</span></a></span></div></li></ul><div class="write-btn-wrap"></div><div id="pagination"></div></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

function expectedOrganizationBoardsEmpty() {
  const expected = expectedOrganizationBoards();
  const listStart = expected.indexOf('<div class="filter-wrap board">');
  const listEnd = expected.indexOf('<div class="write-btn-wrap"></div><div id="pagination"></div>');
  return `${expected
    .slice(0, listStart)
    .replace(
      'value="release"',
      'value="empty"',
    )}<div class="error-wrap"><i class="ico ico-err1"></i><p>No post has been added.</p></div>${expected.slice(
    listEnd,
  )}`;
}

function expectedOrganizationBoards() {
  return EXPECTED_ORGANIZATION_BOARDS.replace(
    '<li class="myOrganizationList active"><a href="#myOrganizationList" data-toggle="tab">Favorite</a></li><li class="myProjectList"><a href="#myProjectList" data-toggle="tab">Project</a></li><li class="myRecentIssueList"><a href="#myRecentIssueList" data-toggle="tab">Recent History</a></li>',
    '<li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li>',
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
    );
}

async function assertOrganizationBoardRowTooltipCleanup(page: Page) {
  const rowTooltipTargets = page.locator(
    ".post-list-wrap .post-item .avatar-wrap, .post-list-wrap .post-item .infos > .infos-item.infos-link-item",
  );
  await expect(rowTooltipTargets).toHaveCount(4);
  expect(
    await rowTooltipTargets.evaluateAll((elements) =>
      elements.map((element) => ({
        placement: element.getAttribute("data-placement"),
        title: element.getAttribute("title"),
        toggle: element.getAttribute("data-toggle"),
      })),
    ),
  ).toEqual([
    { placement: "top", title: "admin", toggle: null },
    { placement: "top", title: "admin", toggle: null },
    { placement: "top", title: "dev", toggle: null },
    { placement: "top", title: "dev", toggle: null },
  ]);
  await expect(page.locator(".notice-wrap .infos-link-item").first()).toHaveText("Site Admin");
  await expect(
    page.locator(".post-list-wrap:not(.notice-wrap) .infos-link-item").first(),
  ).toHaveText("Dev Member");
}

test("organization board aggregate matches legacy group_board_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );
  await expect(page).toHaveTitle("weblabs");
  await expect
    .poll(() => page.evaluate(() => document.head.querySelector("title")?.textContent ?? ""))
    .toBe("weblabs");
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Board");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(2);
  await expect(page.locator(".notice-wrap .post-item")).toHaveCount(1);
  await assertOrganizationBoardRowTooltipCleanup(page);
  await expect(page.locator("#projects")).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(page.locator("#projects")).toHaveAttribute("name", "projectNames[]");
  await expect(page.locator("#projects")).toHaveAttribute("multiple", "");
  await expect(page.locator("#projects")).toHaveAttribute("data-format", "projects");
  await expect(page.locator("#projects")).toHaveAttribute("data-placeholder", "Choose projects");
  await expect(page.locator("#projects")).toHaveAttribute("data-container-css-class", "fullsize");
  await expect(page.locator("#projects option")).toHaveText(["sample", "playground"]);
  expect(
    await page
      .locator("#projects option")
      .evaluateAll((options) => options.map((option) => option.getAttribute("value"))),
  ).toEqual(["sample", "playground"]);
  await expect(page.locator('#projects option[value="sample"]')).toHaveJSProperty("selected", true);
  await expect(page.locator("#projects option[data-avatar-url]")).toHaveCount(0);
  await expect(page.locator(".filter-wrap.board .filter.active")).toHaveText("Comments");
  await expect(page.locator(".filter-wrap.board .filter.active")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards?orderBy=numOfComments&orderDir=asc`,
  );

  await page.locator("#projects").selectOption("playground");
  await expect
    .poll(() => new URL(page.url()).searchParams.getAll("projectNames[]"))
    .toEqual(["playground"]);
  await expect(page.locator("#option_form")).toBeVisible();

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedOrganizationBoards()
        .replace('value="sample" selected=""', 'value="sample"')
        .replace('value="playground"', 'value="playground" selected=""')
        .replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("organization board row tooltip marker cleanup preserves legacy title placement and copy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );

  await assertOrganizationBoardRowTooltipCleanup(page);
});

test("organization board row missing author fallback uses legacy message copy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page, "missingAuthor");

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );

  const missingAuthorRow = page.locator(".post-list-wrap:not(.notice-wrap) .post-item").first();
  await expect(missingAuthorRow.locator(".title-wrap .title")).toHaveText("Release note");
  await expect(missingAuthorRow.locator(".infos > .infos-item").first()).toHaveText("No author");
  await expect(missingAuthorRow.locator(".infos > .infos-item").first()).toHaveClass("infos-item");
  await expect(missingAuthorRow.locator(".infos > .infos-item.infos-link-item")).toHaveCount(0);
  await expect(missingAuthorRow.locator(".group-project-name")).toHaveText("sample");
});

test("organization board project selector omits select2 option metadata", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );

  const projects = page.locator("#projects");
  await expect(projects).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(projects).toHaveAttribute("id", "projects");
  await expect(projects).toHaveAttribute("name", "projectNames[]");
  await expect(projects).toHaveAttribute("multiple", "");
  await expect(projects).toHaveAttribute("data-format", "projects");
  await expect(projects).toHaveAttribute("data-placeholder", "Choose projects");
  await expect(projects).toHaveAttribute("data-container-css-class", "fullsize");
  await expect(projects.locator("option")).toHaveText(["sample", "playground"]);
  expect(
    await projects
      .locator("option")
      .evaluateAll((options) => options.map((option) => option.getAttribute("value"))),
  ).toEqual(["sample", "playground"]);
  await expect(page.locator('#projects option[value="sample"]')).toHaveJSProperty("selected", true);
  await expect(page.locator("#projects option[data-avatar-url]")).toHaveCount(0);
  await expect(page.locator(".filter-wrap.board .filter.active")).toHaveText("Comments");

  await projects.selectOption("playground");
  await expect
    .poll(() => new URL(page.url()).searchParams.getAll("projectNames[]"))
    .toEqual(["playground"]);
  await expect(page.locator("#option_form")).toBeVisible();
});

test("organization board two-column checkbox popover follows legacy hover and persisted toggle behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );
  await page.evaluate(() => localStorage.removeItem("useTwoColumnMode"));
  await page.reload();

  const wrapper = page.locator("#option_form #two-column-mode-checkbox");
  const toggle = page.locator("#two-column-mode");
  await expect(wrapper).toHaveClass("two-column-icon mr10 hide-in-mobile");
  await expect(wrapper).toHaveAttribute("title", "Two Column Mode");
  await expect(wrapper).not.toHaveAttribute("data-content", /.+/u);
  await expect(wrapper.locator("label.checkbox")).toHaveCount(1);
  await expect(wrapper.locator(".two-column-icon-border")).toHaveCount(1);
  await expect(wrapper.locator(".two-column-mode-text")).toHaveText("Column View");
  await expect(wrapper.locator(".popover.top")).toHaveCount(0);
  await expect(toggle).not.toBeChecked();
  expect(await organizationBoardTwoColumnMetrics(page)).toEqual({
    borderColor: "rgb(3, 175, 255)",
    borderPadding: "3px 3px 0px",
    borderRadius: "3px",
    borderTextColor: "rgb(3, 169, 244)",
    checkboxId: "two-column-mode",
    checkboxMargin: "4px 4px 0px 2px",
    dataContent: null,
    display: "inline-block",
    followsSearchBar: true,
    lineHeight: "37px",
    marginLeft: "10px",
    text: "Column View",
    textLineHeight: "20px",
    textPadding: "0px 4px 0px 0px",
    title: "Two Column Mode",
    wrapperClass: "two-column-icon mr10 hide-in-mobile",
    wrapperPosition: "relative",
  });

  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("true");
  await page.reload();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await page.locator("#two-column-mode").click();
  await expect(page.locator("#two-column-mode")).not.toBeChecked();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("useTwoColumnMode")))
    .toBe("false");

  await wrapper.hover();
  const hoverPopover = wrapper.locator(".popover.top");
  await expect(hoverPopover).toBeVisible();
  await expect(hoverPopover.locator(".popover-title")).toHaveText("Two Column Mode");
  await expect(hoverPopover.locator(".popover-content")).toHaveText(
    "Splits list and body into columns respectively",
  );
  expect(await organizationBoardTwoColumnPopoverMetrics(page)).toEqual({
    contentText: "Splits list and body into columns respectively",
    hasArrow: true,
    placementClass: true,
    popoverBottomIsAboveToggleBottom: true,
    role: "tooltip",
    titleText: "Two Column Mode",
  });
  await page.locator("body").hover({ position: { x: 10, y: 10 } });
  await expect(wrapper.locator(".popover")).toHaveCount(0);

  await page.locator('#option_form input[name="filter"]').focus();
  await toggle.focus();
  const focusPopover = wrapper.locator(".popover.top");
  await expect(focusPopover).toBeVisible();
  await page.locator('#option_form input[name="filter"]').focus();
  await expect(wrapper.locator(".popover")).toHaveCount(0);
});

test("organization board aggregate pins the live localhost guest shell title and scope branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page, "default", { isAnonymous: true, viewerCanUpdate: false });

  await page.goto(`${basePath}/organizations/weblabs/boards`);

  await expect(page).toHaveTitle("weblabs");
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

test("organization board aggregate empty state matches legacy group_board_list.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page, "empty");

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=empty&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );
  await expect(page.locator("#option_form")).toBeVisible();
  await expect(page.locator(".error-wrap")).toHaveText("No post has been added.");
  await expect(page.locator(".filter-wrap.board")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedOrganizationBoardsEmpty().replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("organization board aggregate renders legacy pagination and input behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page, "paginated");

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc&pageNum=1`,
  );

  const pagination = page.locator("#pagination");
  await expect(pagination).toHaveClass("page-navigation-wrap");
  await expect(pagination.locator("ul.page-nums > li.page-num")).toHaveCount(5);
  await expect(pagination.locator(".btn-pg-prev.off")).toHaveCount(1);
  await expect(pagination.locator(".page-num.ikon").first()).toHaveText("Previous page");
  await expect(pagination.locator(".page-num.delimiter")).toHaveText("/");
  await expect(pagination.locator("li.page-num").nth(3)).toHaveText("3");

  const input = pagination.locator('input[name="pageNum"]');
  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveAttribute("pattern", "[0-9]*");
  await expect(input).toHaveAttribute("min", "1");
  await expect(input).toHaveAttribute("max", "3");
  await expect(input).toHaveValue("1");

  const nextLink = pagination.locator(".page-num.ikon a").last();
  await expect(nextLink).toHaveText("Next page");
  await expect(nextLink).not.toHaveAttribute("aria-current", /.+/u);
  await expect(nextLink).not.toHaveAttribute("data-status", /.+/u);
  const nextHref = await nextLink.getAttribute("href");
  expect(nextHref).toContain(`${basePath}/organizations/weblabs/boards`);
  expect(nextHref).toContain("filter=release");
  expect(nextHref).toContain("orderBy=numOfComments");
  expect(nextHref).toContain("orderDir=desc");
  expect(nextHref).toContain("pageNum=2");
  expect(nextHref).toContain("sample");

  await input.evaluate((element) => {
    element.setAttribute("type", "text");
    element.value = "abc";
  });
  await input.press("Enter");
  await expect(input).toHaveValue("1");
  expect(new URL(page.url()).searchParams.get("pageNum")).toBe("1");

  await input.evaluate((element) => {
    element.setAttribute("type", "number");
    element.value = "99";
  });
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(input).toHaveValue("3");
  const prevLink = pagination.locator(".page-num.ikon a").first();
  await expect(prevLink).toHaveText("Previous page");
  await expect(prevLink).not.toHaveAttribute("aria-current", /.+/u);
  await expect(prevLink).not.toHaveAttribute("data-status", /.+/u);
  await expect(pagination.locator(".btn-pg-next.off")).toHaveCount(1);
  await expect(pagination.locator(".page-num.ikon").last()).toHaveText("Next page");
});

test("organization boards menu issue link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__organizationBoardMenuNativeListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithOrganizationMenuAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof HTMLAnchorElement && this.matches(".project-menu-gruop a")) {
        (
          window as Window &
            typeof globalThis & { __organizationBoardMenuNativeListeners: string[] }
        ).__organizationBoardMenuNativeListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );
  const issueLink = page.locator(".project-menu-gruop a").filter({ hasText: "Issue" });
  await expect(issueLink).toHaveAttribute("href", `${basePath}/organizations/weblabs/issues`);
  expect(
    await page.evaluate(
      () =>
        (
          window as Window &
            typeof globalThis & { __organizationBoardMenuNativeListeners?: string[] }
        ).__organizationBoardMenuNativeListeners ?? [],
    ),
  ).toEqual([]);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await issueLink.click();

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath}/organizations/weblabs/issues`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-menu-gruop li.active a")).toHaveText("Issue");
  await expect(page.locator("#search")).toBeVisible();
});

test("organization boards filter and breadcrumb links preserve legacy hrefs with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );

  const breadcrumbLink = page.locator(".project-breadcrumb .project-author a");
  await expect(breadcrumbLink).toHaveAttribute("href", `${basePath}/organizations/weblabs`);

  const updatedFilter = page.locator(".filter-wrap.board .filter").filter({ hasText: "Updated" });
  const createdFilter = page.locator(".filter-wrap.board .filter").filter({ hasText: "Created" });
  const commentsFilter = page.locator(".filter-wrap.board .filter").filter({ hasText: "Comments" });
  await expect(updatedFilter).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards?orderBy=updatedDate&orderDir=desc`,
  );
  await expect(createdFilter).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards?orderBy=createdDate&orderDir=desc`,
  );
  await expect(commentsFilter).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards?orderBy=numOfComments&orderDir=asc`,
  );
  await expect(commentsFilter).toHaveClass("filter active");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await updatedFilter.click();

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`${basePath}/organizations/weblabs/boards`);
  await expect.poll(() => new URL(page.url()).search).toBe("?orderBy=updatedDate&orderDir=desc");
  await expect(updatedFilter).toHaveClass("filter active");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization board row links preserve legacy hrefs with SPA transitions", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationBoards(page);

  await page.goto(
    `${basePath}/organizations/weblabs/boards?filter=release&projectNames%5B%5D=sample&orderBy=numOfComments&orderDir=desc`,
  );

  const releaseRow = page.locator(".post-list-wrap:not(.notice-wrap) .post-item").first();
  await expect(releaseRow.locator(".avatar-wrap")).toHaveAttribute("href", `${basePath}/dev`);
  await expect(releaseRow.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/post/7`,
  );
  await expect(releaseRow.locator(".infos .infos-link-item").first()).toHaveAttribute(
    "href",
    `${basePath}/dev`,
  );
  await expect(releaseRow.locator(".group-project-name")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample`,
  );
  await expect(releaseRow.locator(".item-count-groups a")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/sample/post/7#comments`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await releaseRow.locator(".title-wrap .title").click();

  await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/weblabs/sample/post/7`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization board route source uses direct Links for row navigation", async () => {
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain('declare module "react"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("interface LiHTMLAttributes");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("as unknown as");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("legacyHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("const projectHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("const authorHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("href={projectHref}");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("href={authorHref}");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("href={`${postHref}#comments`}");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain(
    'to="/$ownerName/$projectName/post/$postNumber"',
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain('to="/$ownerName/$projectName"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain('to="/$user"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain('hash="comments"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain(
    "type LegacyPostItemAttrs = HTMLAttributes<HTMLLIElement> & { href: string };",
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain("satisfies LegacyPostItemAttrs");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain("<li {...legacyPostItemAttrs}>");
});

test("organization board route source uses legacy no-author message key", async () => {
  const rowSource = ORGANIZATION_BOARDS_ROUTE_SOURCE.slice(
    ORGANIZATION_BOARDS_ROUTE_SOURCE.indexOf("function OrganizationBoardPost"),
    ORGANIZATION_BOARDS_ROUTE_SOURCE.indexOf("function TwoColumnModeCheckbox"),
  );
  expect(rowSource).toContain("useLegacyMessages()");
  expect(rowSource).toContain('t("issue.noAuthor")');
  expect(rowSource).not.toContain(">No author<");
});

test("organization board route source drops select2-only project option metadata", async () => {
  const projectSelectSource = ORGANIZATION_BOARDS_ROUTE_SOURCE.slice(
    ORGANIZATION_BOARDS_ROUTE_SOURCE.indexOf("<select"),
    ORGANIZATION_BOARDS_ROUTE_SOURCE.indexOf("</select>"),
  );
  expect(projectSelectSource).toContain('id="projects"');
  expect(projectSelectSource).toContain('name="projectNames[]"');
  expect(projectSelectSource).toContain('data-format="projects"');
  expect(projectSelectSource).toContain("multiple");
  expect(projectSelectSource).toContain('data-placeholder={t("organization.choose.projects")}');
  expect(projectSelectSource).toContain('data-container-css-class="fullsize"');
  expect(projectSelectSource).not.toContain('data-toggle="select2"');
  expect(projectSelectSource).not.toContain("data-avatar-url");
});

test("organization board route source renders two-column popover through React state", async () => {
  const twoColumnSource = ORGANIZATION_BOARDS_ROUTE_SOURCE.slice(
    ORGANIZATION_BOARDS_ROUTE_SOURCE.indexOf("function TwoColumnModeCheckbox"),
    ORGANIZATION_BOARDS_ROUTE_SOURCE.indexOf("function OrganizationHeader"),
  );
  expect(twoColumnSource).toContain("useState(false)");
  expect(twoColumnSource).toContain('localStorage.getItem("useTwoColumnMode") === "true"');
  expect(twoColumnSource).toContain('localStorage.setItem("useTwoColumnMode", String(checked))');
  expect(twoColumnSource).toContain("setTimeout(() => setShowPopover(true), 100)");
  expect(twoColumnSource).toContain("setTimeout(() => setShowPopover(false), 100)");
  expect(twoColumnSource).toContain('className="popover top"');
  expect(twoColumnSource).toContain('role="tooltip"');
  expect(twoColumnSource).not.toContain("data-content=");
  expect(twoColumnSource).not.toContain("document.");
  expect(twoColumnSource).not.toContain("addEventListener");
  expect(twoColumnSource).not.toContain("classList");
  expect(twoColumnSource).not.toContain("style.display");
  expect(twoColumnSource).not.toContain("dangerouslySetInnerHTML");
});

test("organization board route source uses direct Links for organization top, filter, and header navigation", async () => {
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toMatch(/<a\b/u);
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toMatch(
    /\b(?:document|globalThis\.document|window\.document|window\.parent\.document)\.title\b/u,
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("htmlDocument.title");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain("<title>{organizationName}</title>");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("boardListHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("organizationHref");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).not.toContain("OrganizationRouteLink");
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain('to="/organizations/$organizationName"');
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain(
    'to="/organizations/$organizationName/issues"',
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain(
    'to="/organizations/$organizationName/boards"',
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain(
    'to="/organizations/$organizationName/pullrequests"',
  );
  expect(ORGANIZATION_BOARDS_ROUTE_SOURCE).toContain(
    'to="/organizations/$organizationName/settingform"',
  );
});

async function organizationBoardTwoColumnMetrics(page: Page) {
  return page.locator("#option_form #two-column-mode-checkbox").evaluate((element) => {
    const wrapperStyle = window.getComputedStyle(element);
    const border = element.querySelector(".two-column-icon-border") as HTMLElement;
    const input = element.querySelector("#two-column-mode") as HTMLInputElement;
    const text = element.querySelector(".two-column-mode-text") as HTMLElement;
    const searchBar = document.querySelector("#option_form .search-bar");
    const missing = Object.entries({ border, input, text })
      .filter(([, node]) => !node)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected organization board two-column targets: ${missing.join(", ")}`);
    }
    const borderStyle = window.getComputedStyle(border);
    const inputStyle = window.getComputedStyle(input);
    const textStyle = window.getComputedStyle(text);

    return {
      borderColor: borderStyle.borderColor,
      borderPadding: borderStyle.padding,
      borderRadius: borderStyle.borderRadius,
      borderTextColor: borderStyle.color,
      checkboxId: input.id,
      checkboxMargin: inputStyle.margin,
      dataContent: element.getAttribute("data-content"),
      display: wrapperStyle.display,
      followsSearchBar: Boolean(
        searchBar &&
        searchBar.compareDocumentPosition(element) === Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      lineHeight: wrapperStyle.lineHeight,
      marginLeft: wrapperStyle.marginLeft,
      text: text.textContent?.trim(),
      textLineHeight: textStyle.lineHeight,
      textPadding: textStyle.padding,
      title: element.getAttribute("title"),
      wrapperClass: element.getAttribute("class"),
      wrapperPosition: wrapperStyle.position,
    };
  });
}

async function organizationBoardTwoColumnPopoverMetrics(page: Page) {
  return page.locator("#option_form #two-column-mode-checkbox").evaluate((wrapper) => {
    const popover = wrapper.querySelector(".popover") as HTMLElement;
    const arrow = wrapper.querySelector(".popover .arrow") as HTMLElement;
    const title = wrapper.querySelector(".popover-title") as HTMLElement;
    const content = wrapper.querySelector(".popover-content") as HTMLElement;
    const toggle = wrapper.querySelector("#two-column-mode") as HTMLInputElement;
    const missing = Object.entries({ arrow, content, popover, title, toggle })
      .filter(([, node]) => !node)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected organization board two-column popover targets: ${missing.join(", ")}`,
      );
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

async function mockOrganizationBoards(
  page: Page,
  state: "default" | "empty" | "missingAuthor" | "paginated" = "default",
  options: { isAnonymous?: boolean; viewerCanUpdate?: boolean } = {},
) {
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
  await page.route("**/api/v1/organizations/weblabs/boards**", async (route) => {
    const isEmpty = state === "empty";
    const isMissingAuthor = state === "missingAuthor";
    const isPaginated = state === "paginated";
    const url = new URL(route.request().url());
    const pageNum = Number(url.searchParams.get("pageNum")) || 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: isEmpty
          ? []
          : [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorLabel: isMissingAuthor ? "" : "Dev Member",
                authorLoginId: "dev",
                commentCount: 2,
                createdLabel: "Jul 1, 2026",
                labels: [],
                notice: false,
                ownerName: "weblabs",
                postNumber: "7",
                projectName: "sample",
                readme: false,
                title: "Release note",
                updatedLabel: "Jul 1, 2026",
              },
            ],
        notices: isEmpty
          ? []
          : [
              {
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                authorLabel: "Site Admin",
                authorLoginId: "admin",
                commentCount: 1,
                createdLabel: "Jul 1, 2026",
                labels: [],
                notice: true,
                ownerName: "weblabs",
                postNumber: "9",
                projectName: "sample",
                readme: false,
                title: "Pinned release notice",
                updatedLabel: "Jul 1, 2026",
              },
            ],
        organizationName: "weblabs",
        pageNum,
        pageSize: 20,
        totalCount: isEmpty ? 0 : isPaginated ? 45 : 2,
        totalPages: isEmpty ? 0 : isPaginated ? 3 : 1,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/issues**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        closedIssueCount: 0,
        filter: "",
        items: [],
        openIssueCount: 0,
        orderBy: "createdDate",
        orderDir: "desc",
        organizationName: "weblabs",
        pageNum: 1,
        pageSize: 20,
        state: "open",
        totalCount: 0,
        totalPages: 1,
        viewerUserId: 1,
        visibleProjects: [
          { ownerName: "weblabs", projectName: "sample" },
          { ownerName: "weblabs", projectName: "playground" },
        ],
      }),
    });
  });
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
