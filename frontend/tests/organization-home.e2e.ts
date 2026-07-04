import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const ORGANIZATION_HOME_ROUTE_SOURCE = "src/routes/organizations/$organizationName.tsx";

const EXPECTED_ORGANIZATION_HOME = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer"><div class="gnb-inner"><div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div><ul class="gnb-nav"><li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li><li><form action="__BASE_PATH__/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="search-box"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li></ul><div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div><ul class="gnb-usermenu"><li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li><li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li><li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li><li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li></ul></div></header>
<div class="project-header-outer" style="background-image:url('/assets/images/organization_default_logo.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/organization_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author"><span class="group-title-head">group</span><a href="__BASE_PATH__/organizations/weblabs">weblabs</a></span></div></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class="active"><a href="__BASE_PATH__/organizations/weblabs">Group Home</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/issues">Issue</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/boards">Board</a></li><li class=""><a href="__BASE_PATH__/organizations/weblabs/pullrequests">Pull request</a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class=""><a href="__BASE_PATH__/organizations/weblabs/settingform"><i class="yobicon-cog"></i><span class="blind">Project configuration</span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="project-home-header row-fluid"><div class="span9 span-hard-wrap"><div class="project-overview"><h3><span id="project-description">Web labs group</span></h3></div><div class="project-search-wrap row-fluid mt10"><div class="span7"><div class="search-bar"><input name="mylist-filter" id="mylist-filter" class="textbox full" type="text" value="" data-toggle="item-search" data-items="project-item" placeholder="Type name"><button type="button" class="search-btn"><i class="yobicon-search"></i></button></div></div><div class="pull-right"><a href="__BASE_PATH__/projectform?owner=weblabs" class="ybtn ybtn-primary">Create new project</a></div></div><ul class="all-projects"><li class="project" data-item="project-item" data-value="sample Sample project"><div class="info-wrap"><div class="owner-avatar-wrap hide-in-mobile"><a href="__BASE_PATH__/weblabs/sample"><img src="/assets/images/project_default_logo.png" alt="sample.name"></a></div><div style="float:left"><div class="header"><a href="__BASE_PATH__/weblabs/sample" class="black">sample</a></div><div class="desc">Sample project</div><p class="name-tag">by <a href="__BASE_PATH__/weblabs" class="owner-name-small">weblabs</a> at <strong title="2026-06-30">Jun 30, 2026</strong> <span class="small-font">,Latest code update <strong title="2026-07-01">Jul 1, 2026</strong></span></p></div></div><div class="stats-wrap pull-right"><div class="members"><ul class="unstyled"></ul><p><i class="yobicon-friends yobicon-middle"></i><strong>1</strong><i class="yobicon-eye"></i> <strong>5</strong><i class="yobicon-lightbulb ramp-on" data-toggle="tooltip" title="Watching projects"></i></p></div></div></li></ul></div><div class="span3 span-hard-wrap"><div class="bubble-wrap gray project-home"><div class="inner member-info"><header><h3>Group Manager</h3><button type="button" class="ybtn ybtn-minimum ybtn-danger pull-right" id="groupLeaveBtn" data-href="__BASE_PATH__/organizations/weblabs/leave">Leave the group</button></header><div class="member-wrap "><ul class="project-members"><li class="member"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-45.png" height="45" width="45"></a><a href="__BASE_PATH__/admin" data-toggle="tooltip" data-placement="top" title="admin">Site Admin</a></li></ul></div></div></div><div class="bubble-wrap gray project-home mt10"><div class="inner member-info"><header><h3>Group Member</h3></header><div class="member-wrap"><ul class="unstyled project-members"><li class="member"><a href="__BASE_PATH__/dev" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="dev"><img src="/assets/images/default-avatar-45.png" height="45" width="45"></a><a href="__BASE_PATH__/dev" data-toggle="tooltip" data-placement="top" title="dev">Dev Member</a></li></ul></div></div></div></div></div></div></div>
<div id="alertLeave" class="modal hide"><div class="modal-header"><button type="button" class="close" data-dismiss="modal">×</button><h3>Leave the group</h3></div><div class="modal-body"><p>Do you want to leave this group?</p></div><div class="modal-footer"><button type="button" class="ybtn ybtn-info ybtn-mini" id="leaveBtn">Yes</button><button type="button" class="ybtn ybtn-mini" data-dismiss="modal">No</button></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("organization home matches legacy organization/view.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationHome(page);

  await page.goto(`${basePath}/organizations/weblabs`);
  await expect(page.locator("#mylist-filter")).toBeVisible();
  await expect(page.locator(".all-projects .project")).toHaveCount(1);
  await expect(page.locator("#alertLeave")).toHaveClass(/hide/);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_ORGANIZATION_HOME.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("organization home menu settings link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationHomeMenuNativeLinkAudit(page);
  await mockOrganizationHome(page);

  await page.goto(`${basePath}/organizations/weblabs`);
  const settingsLink = page.locator(".project-setting a");
  await expect(settingsLink).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await settingsLink.click();

  await expect(page).toHaveURL(`${basePath}/organizations/weblabs/settingform`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs li").first()).toHaveClass("active");
  await expect(page.locator("#saveSetting")).toBeVisible();
  expect(await readOrganizationHomeMenuNativeLinkAudit(page)).toEqual([]);
});

test("organization home menu board link preserves legacy href with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationHomeMenuNativeLinkAudit(page);
  await mockOrganizationHome(page);

  await page.goto(`${basePath}/organizations/weblabs`);
  const boardLink = page.locator(".project-menu-gruop a").filter({ hasText: "Board" });
  await expect(boardLink).toHaveAttribute("href", `${basePath}/organizations/weblabs/boards`);

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
  expect(await readOrganizationHomeMenuNativeLinkAudit(page)).toEqual([]);
});

test("organization home menu links keep legacy hrefs without route-local native listeners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installOrganizationHomeMenuNativeLinkAudit(page);
  await mockOrganizationHome(page);

  await page.goto(`${basePath}/organizations/weblabs`);
  await expect(page.locator(".project-menu-gruop a")).toHaveCount(4);
  await expect(page.locator(".project-menu-gruop a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/issues`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(2)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/boards`,
  );
  await expect(page.locator(".project-menu-gruop a").nth(3)).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/pullrequests`,
  );
  await expect(page.locator(".project-setting a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs/settingform`,
  );
  await expect(page.locator(".project-breadcrumb a")).toHaveAttribute(
    "href",
    `${basePath}/organizations/weblabs`,
  );
  const homeMenuItem = page.locator(".project-menu-gruop li").first();
  const homeMenuLink = homeMenuItem.locator("a");
  const breadcrumbLink = page.locator(".project-breadcrumb a");
  await expect(homeMenuItem).toHaveClass("active");
  await expect(homeMenuLink).toHaveText("Group Home");
  await expect(homeMenuLink).not.toHaveAttribute("class");
  await expect(homeMenuLink).not.toHaveAttribute("aria-current");
  await expect(homeMenuLink).not.toHaveAttribute("data-status");
  await expect(breadcrumbLink).toHaveText("weblabs");
  await expect(breadcrumbLink).not.toHaveAttribute("class");
  await expect(breadcrumbLink).not.toHaveAttribute("aria-current");
  await expect(breadcrumbLink).not.toHaveAttribute("data-status");
  expect(await readOrganizationHomeMenuNativeLinkAudit(page)).toEqual([]);
});

test("organization home create-project and member profile links preserve legacy hrefs with SPA transition", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationHome(page);
  await mockOrganizationHomeCreateProjectNavigation(page);

  await page.goto(`${basePath}/organizations/weblabs`);
  const createProjectLink = page.locator(".project-search-wrap .pull-right a.ybtn-primary");
  const adminAvatarLink = page.locator(".project-members .member").first().locator("a.avatar-wrap");
  const adminProfileLink = page.locator(".project-members .member").first().locator("a").nth(1);
  const devProfileLink = page.locator(".project-members .member").nth(1).locator("a").nth(1);

  await expect(createProjectLink).toHaveAttribute("href", `${basePath}/projectform?owner=weblabs`);
  await expect(adminAvatarLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(adminProfileLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(devProfileLink).toHaveAttribute("href", `${basePath}/dev`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await createProjectLink.click();

  await expect
    .poll(() => page.evaluate(() => window.location.pathname + window.location.search))
    .toBe(`${basePath}/projectform?owner=weblabs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#newProjectForm")).toBeVisible();
});

test("organization home project card links preserve legacy hrefs with SPA transitions", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationHome(page);
  await mockOrganizationHomeProjectNavigation(page);

  await page.goto(`${basePath}/organizations/weblabs`);
  const logoLink = page.locator(".all-projects .owner-avatar-wrap a");
  const projectNameLink = page.locator(".all-projects .header a.black");
  const ownerNameLink = page.locator(".all-projects .name-tag a.owner-name-small");

  await expect(logoLink).toHaveAttribute("href", `${basePath}/weblabs/sample`);
  await expect(projectNameLink).toHaveAttribute("href", `${basePath}/weblabs/sample`);
  await expect(ownerNameLink).toHaveAttribute("href", `${basePath}/weblabs`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await projectNameLink.click();

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe(`${basePath}/weblabs/sample`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.goto(`${basePath}/organizations/weblabs`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await ownerNameLink.click();

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe(`${basePath}/weblabs`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("organization home project card route source uses Link for internal card navigation", () => {
  const source = readFileSync(ORGANIZATION_HOME_ROUTE_SOURCE, "utf8");

  expect(source).not.toContain("OrganizationRouteLink");
  expect(source).not.toContain("const projectHref");
  expect(source).not.toContain("<a href={projectHref}");
  expect(source).not.toMatch(/<a\b/);
  expect(source).toContain('hash="organization-home-active-sentinel"');
  expect(source).not.toContain("href={prefixBasePath(basePath, `/${ownerName}`)}");
  expect(source).not.toContain("href={prefixBasePath(basePath, `/${stringField(member.loginId");
  expect(source).not.toContain("href={prefixBasePath(runtimeConfig.basePath");
  expect(source).toContain('to="/$ownerName/$projectName"');
  expect(source).toContain("params={{ ownerName, projectName }}");
  expect(source).toContain('to="/$user"');
  expect(source).toContain("params={{ user: ownerName }}");
  expect(source).toContain('params={{ user: stringField(member.loginId, "") }}');
  expect(source).toContain('to="/projectform"');
  expect(source).toContain("search={{ owner: organizationName }}");
  expect(source).toContain('to="/organizations/$organizationName"');
  expect(source).toContain('to="/organizations/$organizationName/issues"');
  expect(source).toContain('to="/organizations/$organizationName/boards"');
  expect(source).toContain('to="/organizations/$organizationName/pullrequests"');
  expect(source).toContain('to="/organizations/$organizationName/settingform"');
  expect(source).not.toContain("__legacyInactive");
});

test("organization home filters projects like legacy item-search", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationHome(page);

  await page.goto(`${basePath}/organizations/weblabs`);
  await expect(page.locator(".all-projects .project")).toBeVisible();

  await page.locator("#mylist-filter").fill("missing");
  await expect(page.locator(".all-projects .project")).toBeHidden();

  await page.locator("#mylist-filter").fill("sample");
  await expect(page.locator(".all-projects .project")).toBeVisible();
});

test("organization home keeps legacy view.scala.html layout metrics", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationHome(page);

  await page.goto(`${basePath}/organizations/weblabs`);
  await expect(page.locator(".all-projects .project")).toBeVisible();

  const metrics = await organizationHomeMetrics(page);

  expect(metrics.row.paddingTop).toBe("5px");
  expect(metrics.row.paddingBottom).toBe("5px");
  expect(metrics.row.marginBottom).toBe("20px");
  expect(metrics.mainColumn.widthRatio).toBeCloseTo(0.7447, 3);
  expect(metrics.sideColumn.widthRatio).toBeCloseTo(0.234, 3);
  expect(metrics.sideColumn.marginLeftRatio).toBeCloseTo(0.0213, 3);
  expect(metrics.projectList.margin).toBe("0px 0px 20px");
  expect(metrics.projectList.listStyle).toBe("none");
  expect(metrics.projectRow.padding).toBe("15px 0px 10px");
  expect(metrics.projectRow.borderBottom).toBe("1px solid rgb(220, 220, 220)");
  expect(metrics.projectAvatar.width).toBe(50);
  expect(metrics.projectAvatar.height).toBe(50);
  expect(metrics.projectAvatar.marginRight).toBe("10px");
  expect(metrics.projectTitle.fontSize).toBe("20px");
  expect(metrics.projectTitle.fontWeight).toBe("700");
  expect(metrics.projectDesc.maxWidth).toBe("647px");
  expect(metrics.projectDesc.color).toBe("rgb(186, 186, 186)");
  expect(metrics.projectNameTag.fontSize).toBe("11px");
  expect(metrics.projectStats.textAlign).toBe("right");
  expect(metrics.projectStats.strongColor).toBe("rgb(81, 170, 204)");
  expect(metrics.memberPanel.padding).toBe("10px");
  expect(metrics.memberInner.borderRadius).toBe("10px");
  expect(metrics.memberInner.fontSize).toBe("12px");
  expect(metrics.memberHeader.padding).toBe("10px 0px");
  expect(metrics.memberHeader.backgroundColor).toBe("rgb(248, 248, 248)");
  expect(metrics.memberHeaderTitle.fontSize).toBe("12px");
  expect(metrics.memberHeaderTitle.lineHeight).toBe("20px");
  expect(metrics.memberList.padding).toBe("10px");
  expect(metrics.memberRow.padding).toBe("0px 10px");
  expect(metrics.memberRow.color).toBe("rgb(153, 153, 153)");
});

test("organization home leave modal posts legacy leave action", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const leaveRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockOrganizationHome(page, { leaveRequests });

  await page.goto(`${basePath}/organizations/weblabs`);
  await page.locator("#groupLeaveBtn").click();
  await expect(page.locator("#alertLeave")).not.toHaveClass(/hide/);

  await page.locator('#alertLeave [data-dismiss="modal"]').last().click();
  await expect(page.locator("#alertLeave")).toHaveClass(/hide/);
  expect(leaveRequests).toEqual([]);

  await page.locator("#groupLeaveBtn").click();
  await expect(page.locator("#alertLeave")).not.toHaveClass(/hide/);
  await page.locator("#leaveBtn").click();
  await expect(page).toHaveURL(`${basePath}/organizations`);
  expect(leaveRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
});

test("organization home hides leave button when legacy leave validation fails", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockOrganizationHome(page, { viewerCanLeaveAfterValidation: false });

  await page.goto(`${basePath}/organizations/weblabs`);

  await expect(page.locator("#groupLeaveBtn")).toHaveCount(0);
  await expect(page.locator(".bubble-wrap.gray.project-home")).toHaveCount(2);
  await expect(
    page.locator(".bubble-wrap.gray.project-home").first().locator("header h3"),
  ).toHaveText("Group Manager");
  await expect(
    page.locator(".bubble-wrap.gray.project-home").last().locator("header h3"),
  ).toHaveText("Group Member");
  await expect(page.locator("#alertLeave")).toHaveClass(/modal hide/);
  await expect(page.locator("#alertLeave #leaveBtn")).toHaveText("Yes");
});

async function organizationHomeMetrics(page: Page) {
  return page.evaluate(() => {
    const row = mustElement(".project-home-header");
    const mainColumn = mustElement(".project-home-header > .span9");
    const sideColumn = mustElement(".project-home-header > .span3");
    const projectList = mustElement(".all-projects");
    const projectRow = mustElement(".all-projects .project");
    const projectAvatar = mustElement(".all-projects .owner-avatar-wrap");
    const projectTitle = mustElement(".all-projects .header");
    const projectDesc = mustElement(".all-projects .desc");
    const projectNameTag = mustElement(".all-projects .name-tag");
    const projectStats = mustElement(".all-projects .stats-wrap");
    const projectStatsStrong = mustElement(".all-projects .stats-wrap strong");
    const memberPanel = mustElement(".bubble-wrap.gray.project-home");
    const memberInner = mustElement(".bubble-wrap.gray.project-home .inner.member-info");
    const memberHeader = mustElement(".bubble-wrap.gray.project-home .inner.member-info header");
    const memberHeaderTitle = mustElement(
      ".bubble-wrap.gray.project-home .inner.member-info header h3",
    );
    const memberList = mustElement(".bubble-wrap.gray.project-home .project-members");
    const memberRow = mustElement(".bubble-wrap.gray.project-home .project-members .member");
    const rowBox = row.getBoundingClientRect();
    const mainColumnBox = mainColumn.getBoundingClientRect();
    const sideColumnBox = sideColumn.getBoundingClientRect();
    const rowStyle = getComputedStyle(row);
    const sideColumnStyle = getComputedStyle(sideColumn);
    const projectListStyle = getComputedStyle(projectList);
    const projectRowStyle = getComputedStyle(projectRow);
    const projectAvatarStyle = getComputedStyle(projectAvatar);
    const projectTitleStyle = getComputedStyle(projectTitle);
    const projectDescStyle = getComputedStyle(projectDesc);
    const projectNameTagStyle = getComputedStyle(projectNameTag);
    const projectStatsStyle = getComputedStyle(projectStats);
    const memberPanelStyle = getComputedStyle(memberPanel);
    const memberInnerStyle = getComputedStyle(memberInner);
    const memberHeaderStyle = getComputedStyle(memberHeader);
    const memberHeaderTitleStyle = getComputedStyle(memberHeaderTitle);
    const memberListStyle = getComputedStyle(memberList);
    const memberRowStyle = getComputedStyle(memberRow);

    return {
      row: {
        paddingBottom: rowStyle.paddingBottom,
        paddingTop: rowStyle.paddingTop,
        marginBottom: rowStyle.marginBottom,
      },
      mainColumn: {
        widthRatio: ratio(mainColumnBox.width, rowBox.width),
      },
      sideColumn: {
        marginLeftRatio: ratio(parseFloat(sideColumnStyle.marginLeft), rowBox.width),
        widthRatio: ratio(sideColumnBox.width, rowBox.width),
      },
      projectList: {
        listStyle: projectListStyle.listStyleType,
        margin: projectListStyle.margin,
      },
      projectRow: {
        borderBottom: `${projectRowStyle.borderBottomWidth} ${projectRowStyle.borderBottomStyle} ${projectRowStyle.borderBottomColor}`,
        padding: projectRowStyle.padding,
      },
      projectAvatar: {
        height: Math.round(projectAvatar.getBoundingClientRect().height),
        marginRight: projectAvatarStyle.marginRight,
        width: Math.round(projectAvatar.getBoundingClientRect().width),
      },
      projectTitle: {
        fontSize: projectTitleStyle.fontSize,
        fontWeight: projectTitleStyle.fontWeight,
      },
      projectDesc: {
        color: projectDescStyle.color,
        maxWidth: projectDescStyle.maxWidth,
      },
      projectNameTag: {
        fontSize: projectNameTagStyle.fontSize,
      },
      projectStats: {
        strongColor: getComputedStyle(projectStatsStrong).color,
        textAlign: projectStatsStyle.textAlign,
      },
      memberPanel: {
        padding: memberPanelStyle.padding,
      },
      memberInner: {
        borderRadius: memberInnerStyle.borderRadius,
        fontSize: memberInnerStyle.fontSize,
      },
      memberHeader: {
        backgroundColor: memberHeaderStyle.backgroundColor,
        padding: memberHeaderStyle.padding,
      },
      memberHeaderTitle: {
        fontSize: memberHeaderTitleStyle.fontSize,
        lineHeight: memberHeaderTitleStyle.lineHeight,
      },
      memberList: {
        padding: memberListStyle.padding,
      },
      memberRow: {
        color: memberRowStyle.color,
        padding: memberRowStyle.padding,
      },
    };

    function mustElement(selector: string) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing selector: ${selector}`);
      }
      return element;
    }

    function ratio(value: number, base: number) {
      return Math.round((value / base) * 10_000) / 10_000;
    }
  });
}

async function mockOrganizationHome(
  page: Page,
  options: {
    leaveRequests?: { hasCsrfToken: boolean; method: string }[];
    viewerCanLeaveAfterValidation?: boolean;
  } = {},
) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-org-home" },
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
  await page.route("**/api/v1/organizations/weblabs/leave", async (route) => {
    options.leaveRequests?.push({
      hasCsrfToken: Boolean(route.request().headers()["x-csrf-token"]),
      method: route.request().method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ redirectPath: "/organizations" }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        adminMembers: [
          {
            avatarUrl: "/assets/images/default-avatar-45.png",
            loginId: "admin",
            role: "org_admin",
            userLabel: "Site Admin",
          },
        ],
        description: "Web labs group",
        logoUrl: "/assets/images/organization_default_logo.png",
        memberMembers: [
          {
            avatarUrl: "/assets/images/default-avatar-45.png",
            loginId: "dev",
            role: "org_member",
            userLabel: "Dev Member",
          },
        ],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanLeaveAfterValidation: options.viewerCanLeaveAfterValidation ?? true,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        visibleProjects: [
          {
            createdLabel: "Jun 30, 2026",
            createdTitle: "2026-06-30",
            isWatching: true,
            lastPushedLabel: "Jul 1, 2026",
            lastPushedTitle: "2026-07-01",
            logoUrl: "/assets/images/project_default_logo.png",
            memberCount: 1,
            overview: "Sample project",
            ownerName: "weblabs",
            projectName: "sample",
            watchCount: 5,
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/organizations/weblabs/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Web labs group",
        id: 42,
        logoUrl: "/assets/images/organization_default_logo.png",
        organizationName: "weblabs",
        viewerCanUpdate: true,
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
}

async function mockOrganizationHomeProjectNavigation(page: Page) {
  await page.route("**/api/v1/owners/weblabs/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        cloneUrl: "https://example.com/weblabs/sample.git",
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          noMilestoneOpenIssueCount: 0,
          pullRequests: [],
          unassignedOpenIssueCount: 0,
        },
        enrollmentRequestCount: 0,
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        overview: "Sample project",
        ownerName: "weblabs",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanCreateCommitResource: true,
        viewerCanLeave: true,
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/users/weblabs/profile**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        daysAgo: 14,
        issueItems: [],
        profile: {
          avatarUrl: "/assets/images/organization_default_logo.png",
          displayName: "weblabs",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "weblabs",
          primaryEmailAddress: "weblabs@example.com",
          sinceLabel: "Jun 30, 2026",
        },
        projectItems: [],
        pullRequestItems: [],
        selected: "issues",
      }),
    });
  });
}

async function mockOrganizationHomeCreateProjectNavigation(page: Page) {
  await page.route("**/api/v1/projects/form-options?owner=weblabs", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerOptions: [
          {
            avatarUrl: "/assets/images/organization_default_logo.png",
            displayName: "weblabs",
            organization: true,
            ownerName: "weblabs",
            selected: true,
          },
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            displayName: "Site Admin",
            organization: false,
            ownerName: "admin",
            selected: false,
          },
        ],
        selectedOwnerName: "weblabs",
      }),
    });
  });
}

async function installOrganizationHomeMenuNativeLinkAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const anchorListeners: string[] = [];
    Object.defineProperty(window, "__yonaOrganizationHomeMenuNativeLinkListeners", {
      configurable: true,
      value: anchorListeners,
    });
    Element.prototype.addEventListener = function addEventListenerWithOrganizationHomeMenuAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof Element && this.matches(".project-menu-gruop a, .project-setting a")) {
        anchorListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readOrganizationHomeMenuNativeLinkAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __yonaOrganizationHomeMenuNativeLinkListeners?: string[] }
      ).__yonaOrganizationHomeMenuNativeLinkListeners ?? [],
  );
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, .gnb-outer, .project-header-outer, .project-menu-outer, .page-wrap-outer, #alertLeave, .page-footer-outer",
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
        .filter((attr) => attr.name !== "aria-current" && attr.name !== "data-status")
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
        .filter((attr) => attr.name !== "aria-current" && attr.name !== "data-status")
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
