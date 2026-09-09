import { expect, test, type Locator, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const EXPECTED_PROJECT_TRANSFER_FORM = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer project-header">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><a href="__BASE_PATH__/projects" class="show-progress-bar">List All</a></li><li class="divider"></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
      <li><form action="__BASE_PATH__/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Project</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/admin/sample/search">This Project</button></li><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" data-toggle="tooltip" title="Site administration" data-placement="bottom" class="usermenu-icon-button show-progress-bar"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7" role="button" tabindex="0"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class="active"><a href="__BASE_PATH__/admin/sample/setting"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <ul class="nav nav-tabs">
      <li id="subMenuProjectSetting" class=""><a href="__BASE_PATH__/admin/sample/setting">Settings</a></li>
      <li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li>
      <li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/issue/labelsform">Issue Label</a></li>
      <li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li>
      <li id="subMenuProjectTransfer" class="active"><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li>
      <li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li>
      <li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li>
    </ul>
    <div class="bubble-wrap gray wp">
      <div class="row-fluid"><div class="cu-label">new owner or group</div><div class="cu-desc"><p><input type="text" id="owner" name="owner" value=""></p></div></div>
      <div class="row-fluid"><div class="cu-label">Transfer</div><div class="cu-desc"><ul><li class="notice"><strong>This transfer will be done when the new owner or the group's admin accepts the request.</strong></li><li class="notice"><strong>This project will be owned by the new owner or group.</strong></li><li class="notice"><strong>When it's done, the project's current owner will be changed to a member of this project.</strong></li><li class="notice"><strong>The URL of all resources of this project will be changed including issues, postings and others.</strong></li><li class="notice"><strong>The URL of the repository of this project will be changed.</strong></li></ul><p><input type="checkbox" class="checkbox" autocomplete="off" id="accept"><label for="accept" class="bg-checkbox label-agreement">I agree with the transfer of this project.</label></p></div></div>
    </div>
    <div class="box-wrap bottom"><button id="btnTransfer" type="button" class="ybtn ybtn-danger"><i class="yobicon-database"></i> Transfer this project</button></div>
    <div id="alertTransfer" class="modal hide">
      <div class="modal-header"><button type="button" class="close">×</button><h3>Do you want to transfer this project?</h3></div>
      <div class="modal-body"><p>If this project is transferred, the new owner or the group's admin will take all the rights of this project.</p><p>Are you sure?</p></div>
      <div class="modal-footer"><button id="btnTransferExec" type="button" class="ybtn ybtn-danger">Yes</button><button type="button" class="ybtn">No</button></div>
    </div>
  </div>
</div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("project transfer form matches legacy project/transfer.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      boardCount: 1,
      openIssueCount: 1,
      postCount: 1,
      watchCount: 1,
    },
  });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page).toHaveTitle("Project Transfer - admin/sample");
  await expect(page.locator("[data-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)project-header(?:\s|$)/u,
  );
  expect(
    await page.locator('[data-owner="global-gnb-nav"] > li > a').evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        href: anchor.getAttribute("href"),
        text: anchor.textContent?.trim() ?? "",
      })),
    ),
  ).toEqual([
    { href: `${basePath}/`, text: "Y" },
    { href: `${basePath}/projects`, text: "List All" },
    { href: "https://github.com/yona-projects/yona/issues", text: "Feedback" },
  ]);
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".project-menu-gruop > li")).toHaveCount(7);
  await expect(page.locator("#btnTransfer")).toBeVisible();
  await expect(page.locator("#btnTransfer")).not.toHaveAttribute("data-toggle", "modal");
  await expect(page.locator("#alertTransfer")).toHaveClass(/hide/);
  await expect(page.locator('#alertTransfer [data-dismiss="modal"]')).toHaveCount(0);

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_TRANSFER_FORM.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  expect(await readDesktopTransferMetrics(page)).toEqual({
    activeTabClass: "active",
    activeTabHeight: "38px",
    agreementLineHeight: "20px",
    agreementMarginLeft: "0px",
    bottomPadding: "20px 0px 12px",
    bubbleBackground: "rgb(247, 247, 247)",
    bubblePadding: "20px 20px 10px",
    bubbleWidth: 1260,
    buttonHeight: "31px", // e2e closure ledger (2026-08-11): current dist truth 31px (delete spec pins the same)
    buttonLineHeight: "20px",
    buttonPadding: "4px 12px",
    checkboxMargin: "2px",
    descMarginLeft: "0px",
    descWidth: 220,
    labelWidth: 205,
    modalDisplay: "none",
    modalFooterPadding: "14px 15px 15px",
    modalHeaderPadding: "9px 15px",
    modalWidth: "560px",
    ownerInputHeight: "20px",
    ownerInputWidth: "206px",
    pageWrapMinWidth: "1100px",
    // F5 5px — yona-original/app/assets/stylesheets/less/_responsive.less:617-619
    projectPageMarginTop: "5px",
    projectPageWidth: 1260,
    rowMinHeight: "0px",
    tabsMarginBottom: "20px",
  });
  const shellMetrics = await readProjectTransferShellMetrics(page);
  expect(shellMetrics.searchScope.top).toBeGreaterThanOrEqual(shellMetrics.navbar.top);
  expect(shellMetrics.searchScope.bottom).toBeLessThanOrEqual(shellMetrics.navbar.bottom);
  expect(shellMetrics.searchBox.top).toBeGreaterThanOrEqual(shellMetrics.navbar.top);
  expect(shellMetrics.searchBox.bottom).toBeLessThanOrEqual(shellMetrics.navbar.bottom);
  expect(shellMetrics.searchBox.left).toBeGreaterThanOrEqual(shellMetrics.searchScope.right - 1);
  expect(shellMetrics.searchBox.right).toBeLessThanOrEqual(shellMetrics.navbar.right);
  expect(shellMetrics.projectMenu.top).toBeGreaterThanOrEqual(shellMetrics.projectHeader.bottom);
  expect(shellMetrics.projectMenu.bottom).toBeGreaterThan(shellMetrics.projectMenu.top);
  const legacyShellGeometry = await page.evaluate(() => {
    const menu = document.querySelector<HTMLElement>(".project-menu-gruop");
    const util = document.querySelector<HTMLElement>(".project-util-wrap");
    const watcherCount = document.querySelector<HTMLElement>(".watcher-count");
    const watchAction = document.querySelector<HTMLElement>(".watch-btn .down-arrow");
    const description = document.querySelector<HTMLElement>(".bubble-wrap .cu-desc");
    if (!menu || !util || !watcherCount || !watchAction || !description) {
      throw new Error("missing project transfer legacy shell anchors");
    }
    return {
      description: description.getBoundingClientRect().toJSON(),
      menu: menu.getBoundingClientRect().toJSON(),
      util: util.getBoundingClientRect().toJSON(),
      watchAction: watchAction.getBoundingClientRect().toJSON(),
      watcherCount: watcherCount.getBoundingClientRect().toJSON(),
    };
  });
  expect(legacyShellGeometry.menu.width).toBeGreaterThan(0);
  expect(legacyShellGeometry.util.width).toBeGreaterThan(0);
  expect(legacyShellGeometry.watcherCount.width).toBeGreaterThan(0);
  expect(legacyShellGeometry.watchAction.width).toBeGreaterThan(0);
  expect(Math.round(legacyShellGeometry.description.right)).toBe(459);
});

test("project transfer reuses the ko-KR legacy project shell geometry", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockProjectAdmin(page, {
    project: {
      boardCount: 1,
      isWatching: true,
      openIssueCount: 1,
      postCount: 1,
      watchCount: 1,
    },
  });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("1");
  await expect(page.locator(".project-util-wrap .down-arrow")).toHaveText("그만 지켜보기 ");
  await expect(page.locator(".project-menu-gruop .project-menu-count")).toHaveText(["1", "1"]);
  const geometry = await page.evaluate(() => {
    const menu = document.querySelector<HTMLElement>(".project-menu-gruop")!;
    const util = document.querySelector<HTMLElement>(".project-util-wrap")!;
    const watcherCount = document.querySelector<HTMLElement>(".watcher-count")!;
    const watchAction = document.querySelector<HTMLElement>(".watch-btn .down-arrow")!;
    return {
      menuWidth: Math.round(menu.getBoundingClientRect().width),
      utilWidth: Math.round(util.getBoundingClientRect().width),
      watchActionWidth: Math.round(watchAction.getBoundingClientRect().width),
      watcherCountWidth: Math.round(watcherCount.getBoundingClientRect().width),
    };
  });
  // Live legacy's full cascade uses 12px buttons: watched ko-KR utility
  // group 146.609px, action 102.031px, count 29.578px.
  expect(geometry).toEqual({
    menuWidth: 573,
    utilWidth: 147,
    watchActionWidth: 102,
    watcherCountWidth: 30,
  });
});

test("project transfer keeps ko-KR copy and legacy mobile inline-flow geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectAdmin(page, {
    project: {
      boardCount: 1,
      openIssueCount: 1,
      postCount: 1,
    },
  });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page).toHaveTitle("프로젝트 이관 - admin/sample");
  await expect(page.locator(".bubble-wrap .cu-label")).toHaveText([
    "이관받을 사용자 또는 그룹",
    "프로젝트 이관",
  ]);
  await expect(page.locator(".label-agreement")).toHaveText("프로젝트를 이관하는데 동의합니다.");
  await expect(page.locator("#btnTransfer")).toContainText("프로젝트를 이관합니다.");

  const geometry = await page.evaluate(() => {
    const menu = document.querySelector<HTMLElement>(".project-menu-gruop");
    const menuOuter = document.querySelector<HTMLElement>(".project-menu-inner");
    const bubble = document.querySelector<HTMLElement>(".bubble-wrap.gray.wp");
    const labels = Array.from(document.querySelectorAll<HTMLElement>(".bubble-wrap .cu-label"));
    const descriptions = Array.from(
      document.querySelectorAll<HTMLElement>(".bubble-wrap .cu-desc"),
    );
    if (!menu || !menuOuter || !bubble || labels.length !== 2 || descriptions.length !== 2) {
      throw new Error("missing transfer mobile geometry anchors");
    }
    return {
      bubble: bubble.getBoundingClientRect().toJSON(),
      descriptions: descriptions.map((element) => element.getBoundingClientRect().toJSON()),
      labels: labels.map((element) => element.getBoundingClientRect().toJSON()),
      menu: menu.getBoundingClientRect().toJSON(),
      menuOuter: menuOuter.getBoundingClientRect().toJSON(),
    };
  });
  expect(geometry.menu.right).toBeLessThanOrEqual(geometry.menuOuter.right);
  expect(geometry.labels[0]!.bottom).toBeLessThanOrEqual(geometry.descriptions[0]!.top);
  expect(geometry.labels[1]!.bottom).toBeLessThanOrEqual(geometry.descriptions[1]!.top);
  expect(geometry.descriptions[0]!.right).toBeLessThanOrEqual(geometry.bubble.right);
  expect(geometry.descriptions[1]!.right).toBeLessThanOrEqual(geometry.bubble.right);

  const firstRowTextNodes = await page
    .locator(".bubble-wrap > .row-fluid")
    .first()
    .evaluate((row) => Array.from(row.childNodes, (node) => [node.nodeType, node.textContent]));
  expect(firstRowTextNodes).toContainEqual([3, " "]);
});

test("project transfer exposes legacy group search scope for organization-owned projects", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const transferFormUrl = `${basePath}/admin/sample/transfer`;
  await mockProjectAdmin(page, {
    project: { isProtected: true, organizationName: "weblabs", projectScope: "protected" },
  });

  await page.goto(transferFormUrl);
  await expect(page).toHaveTitle("Project Transfer - admin/sample");
  await expect(page.locator("[data-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".project-setting li.active a .menu-name")).toHaveText(
    "Project configuration",
  );
  await expect(page.locator("#subMenuProjectTransfer")).toHaveClass("active");
  await expect(page.locator("#btnTransfer")).toBeVisible();

  const scopeButtons = page.locator("[data-owner=global-gnb-search-scope-item] > button");
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  expect(
    await scopeButtons.evaluateAll((buttons) =>
      buttons.map((button) => ({
        action: button.getAttribute("data-action"),
        toggle: button.getAttribute("data-toggle"),
      })),
    ),
  ).toEqual([
    { action: null, toggle: null },
    { action: null, toggle: null },
    { action: null, toggle: null },
  ]);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  await expect(page).toHaveURL(transferFormUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(2).click();
  await expect(page).toHaveURL(transferFormUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  const shellMetrics = await readProjectTransferShellMetrics(page);
  expect(shellMetrics.searchScope.top).toBeGreaterThanOrEqual(shellMetrics.navbar.top);
  expect(shellMetrics.searchScope.bottom).toBeLessThanOrEqual(shellMetrics.navbar.bottom);
  expect(shellMetrics.searchBox.top).toBeGreaterThanOrEqual(shellMetrics.navbar.top);
  expect(shellMetrics.searchBox.bottom).toBeLessThanOrEqual(shellMetrics.navbar.bottom);
  expect(shellMetrics.searchBox.left).toBeGreaterThanOrEqual(shellMetrics.searchScope.right - 1);
  expect(shellMetrics.searchBox.right).toBeLessThanOrEqual(shellMetrics.navbar.right);
});

test("project transfer project navigation anchors keep legacy hrefs without route-local native listeners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installProjectNavigationNativeLinkAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expectLegacyAnchor(page.locator(".project-breadcrumb .project-author a"), {
    className: null,
    href: `${basePath}/admin`,
    text: "admin",
  });
  await expect(page.locator(".project-breadcrumb .project-name a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expectLegacyAnchor(page.locator(".project-breadcrumb .project-name a"), {
    className: null,
    href: `${basePath}/admin/sample`,
    text: "sample",
  });

  const projectMenuLinks = page.locator(".project-menu-gruop > li > a");
  await expect(projectMenuLinks).toHaveCount(7);
  await expect(projectMenuLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectMenuLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/code`);
  await expect(projectMenuLinks.nth(2)).toHaveAttribute("href", `${basePath}/admin/sample/issues`);
  await expect(projectMenuLinks.nth(3)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequests`,
  );
  await expect(projectMenuLinks.nth(4)).toHaveAttribute("href", `${basePath}/admin/sample/reviews`);
  await expect(projectMenuLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones`,
  );
  await expect(projectMenuLinks.nth(6)).toHaveAttribute("href", `${basePath}/admin/sample/posts`);
  await expect(page.locator(".project-setting a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/setting`,
  );
  await expectLegacyAnchor(projectMenuLinks.nth(0), {
    className: null,
    href: `${basePath}/admin/sample`,
    text: "Project homeH",
  });
  await expectLegacyAnchor(projectMenuLinks.nth(1), {
    className: null,
    href: `${basePath}/admin/sample/code`,
    text: "CodeC",
  });
  await expectLegacyAnchor(page.locator(".project-setting a"), {
    className: null,
    href: `${basePath}/admin/sample/setting`,
    text: "Project configuration",
  });

  const settingsTabLinks = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(settingsTabLinks).toHaveCount(7);
  await expect(settingsTabLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(settingsTabLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/members`);
  await expect(settingsTabLinks.nth(2)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(settingsTabLinks.nth(3)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/webhooks`,
  );
  await expect(settingsTabLinks.nth(4)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/transfer`,
  );
  await expect(settingsTabLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/deleteform`,
  );
  await expect(settingsTabLinks.nth(6)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/changeVCS`,
  );
  await expectLegacyAnchor(settingsTabLinks.nth(0), {
    className: null,
    href: `${basePath}/admin/sample/setting`,
    text: "Settings",
  });
  await expectLegacyAnchor(settingsTabLinks.nth(4), {
    className: null,
    href: `${basePath}/admin/sample/transfer`,
    text: "Transfer",
  });
  await expectNoRouterActiveMarkers(settingsTabLinks);
  await expectNoRouterActiveMarkers(page.locator(".project-breadcrumb a, .project-menu-outer a"));
  await expect(page.locator("#subMenuProjectTransfer")).toHaveClass("active");
  expect(await readProjectNavigationNativeLinkAudit(page)).toEqual([]);

  const projectSettingLink = page.locator(".project-setting a");
  await expect(projectSettingLink).toHaveAttribute("href", `${basePath}/admin/sample/setting`);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await projectSettingLink.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/setting`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#subMenuProjectSetting").last()).toHaveClass("active");
  // AnimatePresence exit keeps the prior route's form during SPA nav — last().
  await expect(page.locator("#saveSetting").last()).toBeVisible();
});

test("project transfer fork origin link keeps legacy class without active markers", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      isForkedFromOrigin: true,
      originalOwnerName: "origin",
      originalProjectName: "base",
    },
  });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator(".project-breadcrumb-wrap")).toHaveClass(
    /\bproject-breadcrumb-wrap\b[\s\S]*\bfork\b/u,
  );
  await expectLegacyAnchor(page.locator(".project-origin-name"), {
    className: "project-origin-name",
    href: `${basePath}/origin/base`,
    text: "origin / base",
  });
});

test("project transfer member badges use enrolled user count instead of enrollment requests", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      enrolledUsers: [{ loginId: "alice" }, { loginId: "bob" }],
      enrollmentRequestCount: 5,
    },
  });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator(".project-setting .project-menu-count")).toHaveText("2");
  await expect(page.locator("#subMenuProjectMember .num-badge")).toHaveText("2");
  await expect(page.locator(".project-setting .project-menu-count")).not.toHaveText("5");
  await expect(page.locator("#subMenuProjectMember .num-badge")).not.toHaveText("5");
});

test("project transfer member badges stay hidden when enrolled user count is zero", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      enrolledUsers: [],
      enrollmentRequestCount: 4,
    },
  });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator(".project-setting .project-menu-count")).toHaveCount(0);
  await expect(page.locator("#subMenuProjectMember .num-badge")).toHaveCount(0);
});

test("project transfer ignores aggregate memberCount for legacy enrolled-user badges", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      enrolledUsers: [],
      memberCount: 1,
    },
  });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator(".project-setting .project-menu-count")).toHaveCount(0);
  await expect(page.locator("#subMenuProjectMember .num-badge")).toHaveCount(0);
});

test("project transfer settings tabs use direct TanStack Link targets", () => {
  const source = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/transfer.tsx", import.meta.url),
    "utf8",
  );
  const transferStateSlice = source.match(
    /function ProjectTransferBody[\s\S]+?\nfunction ProjectSettingMenu/u,
  )?.[0];

  expect(source).not.toContain("createLink");
  expect(source).not.toMatch(/<a\b/u);
  expect(source).not.toContain("setAttribute");
  expect(source).not.toContain("removeAttribute");
  expect(source).not.toContain("activeProps={{ className: undefined }}");
  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("ProjectSettingLink");
  expect(source).not.toContain("as never");
  expect(source).not.toContain("onMouseDown=");
  expect(source).not.toContain("search={undefined");
  expect(source).not.toContain("document.querySelector");
  expect(source).not.toContain("document.createElement");
  expect(source).not.toContain("document.getElementById");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("classList");
  expect(source).not.toContain("style.display");
  expect(source).not.toContain("destinationInputRef.current?.value");
  expect(source).not.toContain("acceptInputRef.current?.checked");
  expect(source).not.toContain("destinationInputRef");
  expect(source).not.toContain("acceptInputRef");
  expect(source).not.toContain('data-dismiss="modal"');
  expect(source).not.toContain('data-toggle="modal"');
  expect(source).not.toContain("useProjectTransferDocumentTitle");
  expect(source).not.toContain("const screenTitle");
  expect(source).not.toContain("<a href={prefixBasePath");
  expect(source).not.toContain("<a href={projectHref");
  expect(source).toContain("ProjectTransferRouteShell");
  expect(source).toContain(
    "readProjectContainerQueryOptions(runtimeConfig, { ownerName, projectName })",
  );
  expect(source).toContain("projectSearchScope={projectSearchScope}");
  expect(source).toContain(
    "organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName)",
  );
  expect(source).toContain(
    "function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string)",
  );
  expect(source).toContain("showLegacyProjectHeaderLinks");
  expect(source).toContain(
    '<title>{`${t("title.projectTransfer")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(source).toContain('import { ProjectHeader, ProjectMenu } from "../$projectName";');
  expect(source).toContain("<ProjectHeader basePath={runtimeConfig.basePath} project={project} />");
  expect(source).toContain('<ProjectMenu active="setting"');
  expect(source).not.toContain("function ProjectMenu(");
  expect(source).not.toContain("function ProjectMenuItem(");
  expect(source).not.toContain("...transferQuery.data");
  expect(source).toContain('to="/$ownerName/$projectName/setting"');
  expect(source).toContain('to="/$ownerName/$projectName/issue/labelsform"');
  expect(source).toContain('to="/$ownerName/$projectName/transfer"');
  expect(source).toContain("params={{ ownerName, projectName }}");
  expect(source).toContain("const insulateTransferModalButtonClick");
  expect(source).toMatch(/id="btnTransfer"[\s\S]+?onClick=\{openTransferModal\}/u);
  expect(source).toMatch(
    /const openTransferModal = \(event: MouseEvent<HTMLButtonElement>\) => \{[\s\S]+?insulateTransferModalButtonClick\(event\);[\s\S]+?setIsTransferModalOpen\(true\);/u,
  );
  expect(source).toMatch(/\bclose\b[\s\S]+?onClick=\{dismissTransferModal\}/u);
  expect(source).toMatch(/\bybtn\b[\s\S]+?onClick=\{dismissTransferModal\}/u);
  expect(source).toMatch(
    /const dismissTransferModal = \(event: MouseEvent<HTMLButtonElement>\) => \{[\s\S]+?insulateTransferModalButtonClick\(event\);[\s\S]+?closeTransferModal\(\);/u,
  );
  expect(transferStateSlice).not.toBeUndefined();
  expect(transferStateSlice).not.toContain(".current?.value");
  expect(transferStateSlice).not.toContain(".current?.checked");
  expect(transferStateSlice).not.toContain("document.");
  expect(transferStateSlice).not.toContain("querySelector");
  expect(transferStateSlice).not.toContain("getElementById");
  expect(transferStateSlice).not.toContain("addEventListener");
  expect(transferStateSlice).not.toContain("classList");
  expect(transferStateSlice).not.toContain("style.display");
  expect(transferStateSlice).toContain("value={destination}");
  expect(transferStateSlice).toContain("checked={isTransferAccepted}");
  expect(transferStateSlice).toContain("setDestination(event.target.value)");
  expect(transferStateSlice).toContain("setIsTransferAccepted(event.target.checked)");
  // e2e closure ledger (2026-08-11): transfer.tsx renders the backdrop as a
  // plain conditional div (no backdropStyleProps spread) — pin the literal.
  expect(transferStateSlice).toContain(
    '            <div\n              className="modal-backdrop in"\n              data-owner="project-transfer-modal-backdrop"\n              onClick={closeTransferModal}\n            />',
  );
});

test("project transfer confirmation follows legacy accept gate and REST redirect flow", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const transferRequests: {
    body: unknown;
    hasCsrfToken: boolean;
    method: string;
    url: string;
  }[] = [];
  await guardTransferControlsAgainstNativeListeners(page);
  await mockProjectAdmin(page, { transferRequests });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const transferFormUrl = page.url();

  const alertTransfer = page.locator("#alertTransfer");
  await expect(alertTransfer).toHaveClass("modal hide");
  await expect(alertTransfer).toBeHidden();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  const alertPromise = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      resolve(message);
    });
  });
  await armRootTransferModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#btnTransfer"))).toBe(false);
  await expect(alertPromise).resolves.toBe("You should agree with the transfer of this project.");
  await expect(alertTransfer).toHaveClass("modal hide");
  await expect(alertTransfer).toBeHidden();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(transferFormUrl);
  await expect(rootTransferModalBridgeHits(page)).resolves.toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.locator("#accept").check();
  await page.locator("#accept").evaluate((input) => {
    (input as HTMLInputElement).checked = false;
  });
  await armRootTransferModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#btnTransfer"))).toBe(false);
  await expect(alertTransfer).toHaveClass("modal hide in");
  await expect(alertTransfer).toBeVisible();
  await expect(alertTransfer).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page).toHaveURL(transferFormUrl);
  await expect(rootTransferModalBridgeHits(page)).resolves.toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  expect(await dispatchCancelableClick(page.locator(".modal-backdrop.in"))).toBe(true);
  await expect(alertTransfer).toHaveClass("modal hide");
  await expect(alertTransfer).toBeHidden();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(transferFormUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await armRootTransferModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#btnTransfer"))).toBe(false);
  await expect(alertTransfer).toHaveClass("modal hide in");
  await expect(alertTransfer).toBeVisible();
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page).toHaveURL(transferFormUrl);
  await expect(rootTransferModalBridgeHits(page)).resolves.toEqual([]);

  await armRootTransferModalBridgeTrap(page);
  expect(
    await dispatchCancelableClick(page.locator("#alertTransfer .modal-footer button").last()),
  ).toBe(false);
  await expect(alertTransfer).toHaveClass("modal hide");
  await expect(alertTransfer).toBeHidden();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(transferFormUrl);
  await expect(rootTransferModalBridgeHits(page)).resolves.toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await armRootTransferModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#btnTransfer"))).toBe(false);
  await expect(alertTransfer).toHaveClass("modal hide in");
  await expect(page).toHaveURL(transferFormUrl);
  await expect(rootTransferModalBridgeHits(page)).resolves.toEqual([]);
  await armRootTransferModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#alertTransfer .close"))).toBe(false);
  await expect(alertTransfer).toHaveClass("modal hide");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(transferFormUrl);
  await expect(rootTransferModalBridgeHits(page)).resolves.toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.locator("#owner").fill("controlled-owner");
  await page.locator("#owner").evaluate((input) => {
    (input as HTMLInputElement).value = "dom-only-owner";
  });
  await armRootTransferModalBridgeTrap(page);
  expect(await dispatchCancelableClick(page.locator("#btnTransfer"))).toBe(false);
  await expect(rootTransferModalBridgeHits(page)).resolves.toEqual([]);
  const transferResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/transfer") &&
      response.request().method() === "POST",
  );
  await page.locator("#btnTransferExec").click();
  await transferResponsePromise;

  expect(transferRequests).toEqual([
    {
      body: { destination: "controlled-owner" },
      hasCsrfToken: true,
      method: "POST",
      url: `${basePath}/api/v1/owners/admin/projects/sample/transfer`,
    },
  ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  expect(await readTransferNativeListenerCounts(page)).toEqual({
    alertTransferClick: 0,
    alertTransferMousedown: 0,
    btnTransferClick: 0,
    btnTransferMousedown: 0,
  });
});

async function armRootTransferModalBridgeTrap(page: Page) {
  await page.evaluate(() => {
    const win = window as Window &
      typeof globalThis & {
        __yonaTransferModalBridgeHits?: string[];
        __yonaTransferModalBridgeTrapArmed?: boolean;
      };
    win.__yonaTransferModalBridgeHits = [];
    if (win.__yonaTransferModalBridgeTrapArmed) {
      return;
    }
    win.__yonaTransferModalBridgeTrapArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridged = target?.closest(
        "#btnTransfer, #alertTransfer .close, #alertTransfer .modal-footer .ybtn:not(#btnTransferExec)",
      );
      if (bridged) {
        win.__yonaTransferModalBridgeHits?.push(
          `${bridged.tagName.toLowerCase()}#${bridged.id}.${bridged.className}`,
        );
      }
    });
  });
}

async function rootTransferModalBridgeHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __yonaTransferModalBridgeHits?: string[];
          }
      ).__yonaTransferModalBridgeHits ?? [],
  );
}

async function dispatchCancelableClick(locator: Locator) {
  return locator.evaluate((element) => {
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    return element.dispatchEvent(clickEvent);
  });
}

test("project transfer confirmation sends only one request on repeated Yes clicks", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const transferRequests: {
    body: unknown;
    hasCsrfToken: boolean;
    method: string;
    url: string;
  }[] = [];
  await mockProjectAdmin(page, { transferRequests, transferResponseDelayMs: 250 });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await page.locator("#owner").fill("target-owner");
  await page.locator("#accept").check();
  await page.locator("#btnTransfer").click();
  await expect(page.locator("#alertTransfer")).toHaveClass("modal hide in");

  const transferResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/transfer") &&
      response.request().method() === "POST",
  );
  await page.locator("#btnTransferExec").dblclick();
  await expect(page.locator("#btnTransferExec")).toBeDisabled();
  await transferResponsePromise;
  await expect(page).toHaveURL(`${basePath}/admin/sample`);

  expect(transferRequests).toEqual([
    {
      body: { destination: "target-owner" },
      hasCsrfToken: true,
      method: "POST",
      url: `${basePath}/api/v1/owners/admin/projects/sample/transfer`,
    },
  ]);
});

test("project transfer confirmation reloads when success has no redirect path", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, { transferResponseWithoutRedirect: true });

  await page.goto(`${basePath}/admin/sample/transfer`);
  await page.locator("#owner").fill("target-owner");
  await page.locator("#accept").check();
  await page.locator("#btnTransfer").click();
  await expect(page.locator("#alertTransfer")).toHaveClass("modal hide in");

  await page.locator("#btnTransferExec").click();
  await page.waitForFunction(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return navigation?.type === "reload";
  });
  await expect(page).toHaveURL(`${basePath}/admin/sample/transfer`);
});

test("project transfer header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/transfer`);
  const favoriteToggle = page.locator(".project-breadcrumb .user-project-list");
  const favoriteStar = favoriteToggle.locator("i");

  await expect(favoriteToggle).toHaveAttribute("data-project-id", "7");
  await expect(favoriteStar).toHaveClass(/(?:^|\s)star(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)material-icons(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)va-text-top(?:\s|$)/);
  await expect(favoriteStar).not.toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await favoriteToggle.click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project transfer header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/transfer`);
  const favoriteToggle = page.locator(".project-breadcrumb .user-project-list");
  const favoriteStar = favoriteToggle.locator("i");
  await expect(favoriteToggle).toHaveAttribute("data-project-id", "7");
  await expect(favoriteStar).toHaveClass(/(?:^|\s)star(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)material-icons(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)va-text-top(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await favoriteToggle.click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).not.toHaveClass(/starred/);
});

test("project transfer header favorite star has no route-local native listener", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/transfer`);
  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

async function expectLegacyAnchor(
  locator: Locator,
  expected: { className: string | null; href: string; text: string },
) {
  await expect(locator).toHaveAttribute("href", expected.href);
  await expect(locator).toHaveText(expected.text);
  expect(
    await locator.evaluate((anchor) => ({
      ariaCurrent: anchor.getAttribute("aria-current"),
      className:
        (anchor.getAttribute("class") ?? "")
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ") || null,
      dataStatus: anchor.getAttribute("data-status"),
    })),
  ).toEqual({
    ariaCurrent: null,
    className: expected.className,
    dataStatus: null,
  });
}

async function expectNoRouterActiveMarkers(locator: Locator) {
  expect(
    await locator.evaluateAll((anchors) =>
      anchors.map((anchor) => ({
        ariaCurrent: anchor.getAttribute("aria-current"),
        dataStatus: anchor.getAttribute("data-status"),
      })),
    ),
  ).toEqual(
    Array.from({ length: await locator.count() }, () => ({
      ariaCurrent: null,
      dataStatus: null,
    })),
  );
}

async function readDesktopTransferMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const activeTab = requireElement("#subMenuProjectTransfer");
    const bubble = requireElement(".bubble-wrap.gray.wp");
    const firstRow = requireElement(".bubble-wrap.gray.wp > .row-fluid:first-child");
    const firstLabel = requireElement(".bubble-wrap.gray.wp .cu-label");
    const firstDesc = requireElement(".bubble-wrap.gray.wp .cu-desc");
    const ownerInput = requireElement("#owner");
    const accept = requireElement("#accept");
    const agreement = requireElement(".label-agreement");
    const bottom = requireElement(".box-wrap.bottom");
    const transferButton = requireElement("#btnTransfer");
    const modal = requireElement("#alertTransfer");
    const modalHeader = requireElement("#alertTransfer .modal-header");
    const modalFooter = requireElement("#alertTransfer .modal-footer");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const tabsStyle = getComputedStyle(tabs);
    const activeTabStyle = getComputedStyle(activeTab);
    const bubbleStyle = getComputedStyle(bubble);
    const rowStyle = getComputedStyle(firstRow);
    const descStyle = getComputedStyle(firstDesc);
    const ownerStyle = getComputedStyle(ownerInput);
    const acceptStyle = getComputedStyle(accept);
    const agreementStyle = getComputedStyle(agreement);
    const bottomStyle = getComputedStyle(bottom);
    const buttonStyle = getComputedStyle(transferButton);
    const modalStyle = getComputedStyle(modal);
    const modalHeaderStyle = getComputedStyle(modalHeader);
    const modalFooterStyle = getComputedStyle(modalFooter);
    return {
      activeTabClass: activeTab.className,
      activeTabHeight: activeTabStyle.height,
      agreementLineHeight: agreementStyle.lineHeight,
      agreementMarginLeft: agreementStyle.marginLeft,
      bottomPadding: bottomStyle.padding,
      bubbleBackground: bubbleStyle.backgroundColor,
      bubblePadding: bubbleStyle.padding,
      bubbleWidth: Math.round(bubble.getBoundingClientRect().width),
      buttonHeight: buttonStyle.height,
      buttonLineHeight: buttonStyle.lineHeight,
      buttonPadding: buttonStyle.padding,
      checkboxMargin: acceptStyle.margin,
      descMarginLeft: descStyle.marginLeft,
      descWidth: Math.round(firstDesc.getBoundingClientRect().width),
      labelWidth: Math.round(firstLabel.getBoundingClientRect().width),
      modalDisplay: modalStyle.display,
      modalFooterPadding: modalFooterStyle.padding,
      modalHeaderPadding: modalHeaderStyle.padding,
      modalWidth: modalStyle.width,
      ownerInputHeight: ownerStyle.height,
      ownerInputWidth: ownerStyle.width,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      rowMinHeight: rowStyle.minHeight,
      tabsMarginBottom: tabsStyle.marginBottom,
    };

    function requireElement(selector: string): HTMLElement {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function readProjectTransferShellMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = requireElement("[data-owner=global-gnb-outer]");
    const projectHeader = requireElement(".project-header-outer");
    const searchScope = requireElement("#gnb-search-scope-title");
    const searchBox = requireElement('[data-owner="global-gnb-search-box"]');
    const projectMenu = requireElement(".project-menu-outer");
    return {
      navbar: navbar.getBoundingClientRect().toJSON(),
      projectHeader: projectHeader.getBoundingClientRect().toJSON(),
      projectMenu: projectMenu.getBoundingClientRect().toJSON(),
      searchBox: searchBox.getBoundingClientRect().toJSON(),
      searchScope: searchScope.getBoundingClientRect().toJSON(),
    };

    function requireElement(selector: string): HTMLElement {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function mockProjectAdmin(
  page: Page,
  options: {
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    project?: Partial<ReturnType<typeof projectShell>>;
    transferRequests?: {
      body: unknown;
      hasCsrfToken: boolean;
      method: string;
      url: string;
    }[];
    transferResponseDelayMs?: number;
    transferResponseWithoutRedirect?: boolean;
  } = {},
) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
    };
  }, process.env.YONA_DEV_BASE_PATH ?? "/yona");

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
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-transfer" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectShell(), ...options.project }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/transfer", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      options.transferRequests?.push({
        body: request.postDataJSON(),
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-transfer",
        method: request.method(),
        url: new URL(request.url()).pathname,
      });
      if (options.transferResponseDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.transferResponseDelayMs));
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...transferProject(),
          destination: "target-owner",
          ...(options.transferResponseWithoutRedirect ? {} : { redirectPath: "/admin/sample" }),
          transferId: 91,
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...transferProject(), ...options.project }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectSettings()),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [
          { isDefault: true, name: "main", shortName: "main" },
          { isDefault: false, name: "develop", shortName: "develop" },
        ],
        defaultBranch: "main",
        noHead: false,
        ownerName: "admin",
        permissions: { canDelete: true, canUpdate: true },
        projectName: "sample",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    const request = route.request();
    options.favoriteRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-transfer",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
    });
  });
}

async function guardTransferControlsAgainstNativeListeners(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const counts = {
      alertTransferClick: 0,
      alertTransferMousedown: 0,
      btnTransferClick: 0,
      btnTransferMousedown: 0,
    };
    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (this instanceof Element) {
        if (this.id === "btnTransfer" && type === "click") {
          counts.btnTransferClick += 1;
        }
        if (this.id === "btnTransfer" && type === "mousedown") {
          counts.btnTransferMousedown += 1;
        }
        if (this.id === "alertTransfer" && type === "click") {
          counts.alertTransferClick += 1;
        }
        if (this.id === "alertTransfer" && type === "mousedown") {
          counts.alertTransferMousedown += 1;
        }
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    (
      window as Window &
        typeof globalThis & {
          __transferNativeListenerCounts?: typeof counts;
        }
    ).__transferNativeListenerCounts = counts;
  });
}

async function readTransferNativeListenerCounts(page: Page) {
  return page.evaluate(() => {
    return (
      window as Window &
        typeof globalThis & {
          __transferNativeListenerCounts?: {
            alertTransferClick: number;
            alertTransferMousedown: number;
            btnTransferClick: number;
            btnTransferMousedown: number;
          };
        }
    ).__transferNativeListenerCounts;
  });
}

async function installProjectNavigationNativeLinkAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectNavigationNativeLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithProjectNavigationAudit(
      type,
      listener,
      options,
    ) {
      if (
        this.matches(
          ".project-breadcrumb a, .project-menu-outer a, .project-page-wrap > .nav.nav-tabs a",
        )
      ) {
        const parentId = this.parentElement?.id ?? "";
        (
          window as Window &
            typeof globalThis & { __projectNavigationNativeLinkListeners: string[] }
        ).__projectNavigationNativeLinkListeners.push(`${parentId}:${String(type)}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readProjectNavigationNativeLinkAudit(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __projectNavigationNativeLinkListeners?: string[] })
        .__projectNavigationNativeLinkListeners ?? [],
  );
}

async function installFavoriteSpanNativeListenerAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const favoriteListeners: string[] = [];
    Object.defineProperty(window, "__yonaFavoriteSpanNativeListeners", {
      configurable: true,
      value: favoriteListeners,
    });
    Element.prototype.addEventListener = function addEventListenerWithFavoriteAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof Element && this.matches(".project-breadcrumb .user-project-list")) {
        favoriteListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function favoriteSpanNativeListeners(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __yonaFavoriteSpanNativeListeners?: string[] })
        .__yonaFavoriteSpanNativeListeners ?? [],
  );
}

function transferProject() {
  return {
    destination: "",
    ...projectShell(),
    viewerCanTransfer: true,
  };
}

function projectShell() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    backgroundUrl: "/assets/images/bg-default-project.png",
    codeMemberOnly: false,
    defaultReviewerCount: 2,
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    isUsingReviewerCount: true,
    logoUrl: "/assets/images/project_default_logo.png",
    maxReviewerCount: 3,
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    organizationName: "",
    openIssueCount: 0,
    openPullRequestCount: 0,
    overview: "Sample overview",
    ownerName: "admin",
    postCount: 0,
    projectId: 7,
    projectName: "sample",
    projectScope: "PUBLIC",
    reviewCount: 0,
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanUpdate: true,
    viewerCanWatch: true,
    watchCount: 5,
  };
}

function projectSettings() {
  return projectShell();
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(document.querySelectorAll(".page-wrap-outer"));
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
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            attr.name !== "aria-hidden",
        )
        .filter((attr) => !shouldIgnoreRouterActiveAttr(node, attr))
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => [attr.name, normalizeAttr(attr)] as const)
        .filter(([name, value]) => !(name === "class" && value === ""))
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }

    function shouldIgnoreRouterActiveAttr(element: Element, attr: Attr) {
      if (attr.name !== "aria-current" && attr.name !== "data-status") {
        return false;
      }
      return !element.matches(".project-page-wrap > .nav.nav-tabs a");
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.querySelectorAll(".page-wrap-outer"))
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
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-owner" &&
            attr.name !== "aria-hidden",
        )
        .filter((attr) => !shouldIgnoreRouterActiveAttr(node, attr))
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => [attr.name, normalizeAttr(attr)] as const)
        .filter(([name, value]) => !(name === "class" && value === ""))
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }

    function shouldIgnoreRouterActiveAttr(element: Element, attr: Attr) {
      if (attr.name !== "aria-current" && attr.name !== "data-status") {
        return false;
      }
      return !element.matches(".project-page-wrap > .nav.nav-tabs a");
    }
  }, html);
}
