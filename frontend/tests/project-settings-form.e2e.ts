import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROJECT_SETTINGS = `
<div class="unsupported hidden"><div class="unsupported-inner"><p id="unsupported-content"></p></div></div>
<header class="gnb-outer project-header">
  <div class="gnb-inner">
    <div class="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar"><i class="yobicon-arrow-left"></i><i class="yobicon-arrow-right"></i></div>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__" class="logo logo-letter">Y</a></li>
      <li><form action="__BASE_PATH__/admin/sample/search" class="input-prepend gnb-search-form" name="gnb-search-form"><input type="hidden" name="searchType" value="auto"><div class="btn-group"><button class="ybtn dropdown-toggle" data-toggle="dropdown" type="button" id="gnb-search-scope-title">This Project</button><ul class="dropdown-menu flat right"><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/admin/sample/search">This Project</button></li><li><button type="button" data-toggle="search-scope" data-action="__BASE_PATH__/search">All Projects</button></li></ul></div><div class="search-box select"><input type="text" name="keyword" autocomplete="off" accesskey="S"><button type="submit"><i class="yobicon-search"></i></button></div></form></li>
    </ul>
    <div id="mySidenav" class="sidenav"><div class="span5 right-menu span-hard-wrap"><div class="row-fluid user-menu-wrap"><span class="user-menu"><a href="__BASE_PATH__/admin">Profile</a></span><span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span><a href="__BASE_PATH__/users/logout"><span class="user-menu logout label">Log out</span></a></div><ul class="nav nav-tabs nm"><li class="myOrganizationList active"><button type="button" data-toggle="tab">Favorite</button></li><li class="myProjectList"><button type="button" data-toggle="tab">Project</button></li><li class="myRecentIssueList"><button type="button" data-toggle="tab">Recent History</button></li></ul><div class="tab-content tab-box"><div id="usermenu-tab-content-list" class="tab-content">Loading...</div></div></div></div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" data-toggle="tooltip" data-placement="bottom" title="Shortcut (A)"><a href="__BASE_PATH__/user/issues" class="user-item-btn loggged-in">My Issues</a></li><li class="divider"></li>
      <li class="gnb-usermenu-item"><a href="__BASE_PATH__/sites/userList" class="usermenu-icon-button show-progress-bar" data-toggle="tooltip" title="Site administration" data-placement="bottom"><i class="yobicon-wrench"></i></a></li><li class="divider"></li>
      <li class="gnb-usermenu-dropdown sidebar-open-btn" id="sidebar-open-btn"><button type="button" class="gnb-dropdown-toggle" data-toggle="tooltip" data-placement="bottom" title="User menu, Shortcut (F)"><span class="avatar-wrap smaller"><img src="/assets/images/default-avatar-32.png"></span><span class="caret"></span></button></li>
      <li class="gnb-usermenu-dropdown"><button type="button" class="gnb-dropdown-toggle dropdwon-box-btn" data-toggle="dropdown"><i class="yobicon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu flat right"><li><a href="__BASE_PATH__/user/issues/new">New issue</a></li><li><a href="__BASE_PATH__/user/issues/new/mine">New issue - personal inbox</a></li><li><hr class="no-margin"></li><li><a href="__BASE_PATH__/projectform">Create new project</a></li><li><a href="__BASE_PATH__/organizations/new">New Group</a></li></ul></li>
    </ul>
  </div>
</header>
<div class="project-header-outer" style="background-image:url('/assets/images/bg-default-project.png')"><div class="project-header-inner"><div class="project-header-wrap"><div class="project-header-avatar"><img src="/assets/images/project_default_logo.png"></div><div class="project-breadcrumb-wrap"><div class="project-breadcrumb"><span class="project-author hide-in-mobile"><a href="__BASE_PATH__/admin">admin</a></span><span class="project-separator hide-in-mobile">/</span><span class="project-name"><a href="__BASE_PATH__/admin/sample">sample</a></span><span class="user-project-list" data-project-id="7"><i class=" star material-icons va-text-top">star</i></span></div></div><div class="project-util-wrap"><ul class="project-util"></ul></div></div></div></div>
<div class="project-menu-outer"><div class="project-menu-inner"><ul class="project-menu-nav project-menu-gruop"><li class=""><a href="__BASE_PATH__/admin/sample"><span class="menu-name">Project home</span><span class="short-menu">H</span></a></li><li class="code-menu "><a href="__BASE_PATH__/admin/sample/code"><span class="menu-name">Code</span><span class="short-menu">C</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/issues"><span class="menu-name">Issue</span><span class="short-menu">I</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/pullRequests"><span class="menu-name">Pull request</span><span class="short-menu">P</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/reviews"><span class="menu-name">Review</span><span class="short-menu">R</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones"><span class="menu-name">Milestone</span><span class="short-menu">M</span></a></li><li class=""><a href="__BASE_PATH__/admin/sample/posts"><span class="menu-name">Board</span><span class="short-menu">B</span></a></li></ul><div class="project-setting"><ul class="project-menu-nav"><li class="active"><a href="__BASE_PATH__/admin/sample/settingform"><i class="yobicon-cog"></i><span class="blind"><span class="menu-name">Project configuration</span></span></a></li></ul></div></div></div>
<div class="page-wrap-outer"><div class="project-page-wrap"><ul class="nav nav-tabs"><li id="subMenuProjectSetting" class="active"><a href="__BASE_PATH__/admin/sample/settingform">Settings</a></li><li id="subMenuProjectMember" class=""><a href="__BASE_PATH__/admin/sample/members">Member</a></li><li id="subMenuIssueLabel" class=""><a href="__BASE_PATH__/admin/sample/issue/labelsform">Issue Label</a></li><li id="subMenuWebhook" class=""><a href="__BASE_PATH__/admin/sample/webhooks">Webhooks</a></li><li id="subMenuProjectTransfer" class=""><a href="__BASE_PATH__/admin/sample/transfer">Transfer</a></li><li id="subMenuProjectDelete" class=""><a href="__BASE_PATH__/admin/sample/deleteform">Delete project</a></li><li id="subMenuProjectChangeVCS" class=""><a href="__BASE_PATH__/admin/sample/changeVCS">Repository Type Change</a></li></ul><form id="saveSetting" method="post" action="__BASE_PATH__/admin/sample/setting" enctype="multipart/form-data" class="nm"><div class="bubble-wrap gray" style="overflow: visible"><input type="hidden" name="id" value="7"><input type="hidden" name="watchingCount" value="5"><div class="box-wrap top clearfix frm-wrap" style="padding-top:20px;"><div class="setting-box left"><div class="logo-wrap" style="background-image:url('/assets/images/project_default_logo.png')"></div><div class="logo-desc"><ul class="unstyled descs"><li><strong>Project logo</strong></li><li>File type: bmp, jpg, gif, png <span class="point">bmp, jpg, gif, png</span></li><li>Maximum file size <span class="point">5MB</span></li><li><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i>File upload<input id="logoPath" type="file" class="file" name="logoPath" accept="image/*"></div></div></li></ul></div></div><dl class="setting-box right"><dt><label for="project-name">Enter project name in alphabetnumerical or symbol characters(_-.)</label></dt><dd style="position:relative"><input id="project-name" type="text" name="name" maxlength="250" value="sample"><br></dd><dt><label for="project-desc">Enter project description</label></dt><dd><textarea id="project-desc" name="overview" maxlength="250" class="textarea">Sample overview</textarea></dd></dl></div><div class="box-wrap middle"><div class="cu-label">Share Options</div><div class="cu-desc"><input name="projectScope" type="radio" class="radio-btn" id="public" value="PUBLIC" checked><label for="public" class="bg-radiobtn label-public">PUBLIC</label><input name="projectScope" type="radio" class="radio-btn" id="private" value="PRIVATE"><label for="private" class="bg-radiobtn label-private">PRIVATE</label><span class="note">Project access must be granted explicitly for each user, but basic information (name, description, etc.) can be exposed to public.</span></div></div><div class="box-wrap middle"><div class="cu-label">Issue Template</div><div class="cu-desc"><a href="__BASE_PATH__/admin/sample/postform?issueTemplate=true" class="ybtn" target="_blank">Edit</a></div></div><div class="box-wrap middle"><div class="cu-label">Only project members can access code or related menus</div><div class="cu-desc"><input name="isCodeAccessibleMemberOnly" type="radio" id="codeAccessibleMemberOnly" class="radio-btn" value="true"><label for="codeAccessibleMemberOnly" class="bg-radiobtn label-public">Yes</label><input name="isCodeAccessibleMemberOnly" type="radio" id="codeAccessibleAnyone" class="radio-btn" value="false" checked><label for="codeAccessibleAnyone" class="bg-radiobtn label-private">No</label><span class="note"></span></div></div><div class="box-wrap middle reviewer-count-wrap" id="reviewerCountSettingPanel"><div class="cu-label vmiddle">Reviewer</div><div class="cu-desc"><input name="isUsingReviewerCount" type="radio" class="radio-btn" id="reviewerCountEnable" value="true" checked><label for="reviewerCountEnable" class="bg-radiobtn label-public">Enable</label><input name="isUsingReviewerCount" id="reviewerCountDisable" type="radio" class="radio-btn" value="false"><label for="reviewerCountDisable" class="bg-radiobtn label-private">Disable</label><div id="welReviewerCount" class="hide" style="display: block;"><input type="hidden" name="defaultReviewerCount" value="2"><div class="btn-group branches"><button class="btn dropdown-toggle large"><span class="d-label">2</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="1"><button type="button">1</button></li><li data-value="2"><button type="button">2</button></li><li data-value="3"><button type="button">3</button></li></ul></div><span class="note ml10">of reviewers is required to merge pull request.</span></div></div></div><div class="box-wrap middle" id="defaultBranceSettingPanel"><div class="cu-label vmiddle">Default branch</div><div class="cu-desc"><select id="project-default-branch" name="defaultBranch" data-format="branch" data-dropdown-css-class="branches" style="min-width: 220px;"><option value="main" selected>main</option><option value="develop">develop</option></select></div></div><div class="box-wrap middle"><div class="cu-label vmiddle">Menu Setting</div><div class="cu-desc"><label for="menuSettingCode" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingCode" name="code" value="true" checked>Code</label><label for="menuSettingIssue" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingIssue" name="issue" value="true" checked>Issue</label><label for="menuSettingPullRequest" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingPullRequest" name="pullRequest" value="true" checked>Pull request</label><label for="menuSettingReview" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingReview" name="review" value="true" checked>Review</label><label for="menuSettingMilestone" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingMilestone" name="milestone" value="true" checked>Milestone</label><label for="menuSettingBoard" class="bg-radiobtn label-public inline-list"><input type="checkbox" class="radio-btn" id="menuSettingBoard" name="board" value="true" checked>Board</label></div></div></div><div class="box-wrap bottom"><button id="save" type="submit" class="ybtn ybtn-success">Save</button></div></form></div></div>
<footer class="page-footer-outer"><div class="page-footer"><span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" target="_blank" class="yona-author">Yona authors</a> &amp; © <a href="https://navercorp.com" target="_blank">NAVER Corp.</a> &amp; <a href="https://naverlabs.com/" target="_blank" class="naver-labs">NAVER LABS</a> Supported by <a href="https://www.ncloud.com/?referer=yona" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span></div></footer>
`;

test("SVN settings keeps canonical watcher utility from the project container", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockProjectSettings(page, {
    container: {
      isWatching: true,
      viewerCanWatch: true,
      watchCount: 1,
    },
    project: {
      isWatching: false,
      viewerCanWatch: false,
      watchCount: 0,
    },
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/settingform`);

  await expect(page.locator(".project-util-wrap .watch-btn")).toBeVisible();
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("1");
  await expect(page.locator(".project-menu-gruop > li")).toHaveCount(7);
});

test("project settings prefixes empty logo and background fallbacks with the configured context path", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mountPrefix = basePath === "/" ? "" : basePath;
  await mockProjectSettings(page, {
    project: {
      backgroundImageUrl: "",
      backgroundUrl: "",
      logoUrl: "",
    },
  });

  await page.goto(`${mountPrefix}/admin/sample/settingform`);

  await expect(page.locator(".project-header-outer")).toHaveAttribute(
    "style",
    expect.stringContaining(`${mountPrefix}/legacy-assets/images/project_default.jpg`),
  );
  await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    expect.stringContaining("project_default_logo.png"),
  );
  await expect(page.locator(".setting-box.left .logo-wrap")).toHaveAttribute(
    "style",
    expect.stringContaining("project_default_logo.png"),
  );
  await test.info().attach("project-settings-fallback-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${mountPrefix}/admin/sample/settingform`);
  await expect(page.locator(".project-header-outer")).toHaveAttribute(
    "style",
    expect.stringContaining(`${mountPrefix}/legacy-assets/images/project_default.jpg`),
  );
  await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    expect.stringContaining("project_default_logo.png"),
  );
  await expect(page.locator(".setting-box.left .logo-wrap")).toHaveAttribute(
    "style",
    expect.stringContaining("project_default_logo.png"),
  );
  await test.info().attach("project-settings-fallback-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("project settings uses the legacy project shell watcher and counting badges", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockProjectSettings(page, {
    project: {
      boardCount: 1,
      isWatching: true,
      openIssueCount: 1,
      viewerCanWatch: true,
      watchCount: 1,
    },
  });

  await page.goto(`${basePath}/admin/sample/settingform`);

  const projectUtil = page.locator(".project-util-wrap .project-util");
  await expect(projectUtil.locator(".watch-btn")).toBeVisible();
  await expect(projectUtil.locator(".watcher-count")).toHaveText("1");
  await expect(projectUtil.locator(".down-arrow")).toHaveText("그만 지켜보기");
  await expect(page.locator(".project-menu-gruop .project-menu-count")).toHaveText(["1", "1"]);

  const shell = await page.evaluate(() => {
    const breadcrumb = document.querySelector(".project-breadcrumb-wrap");
    const util = document.querySelector(".project-util-wrap");
    const menu = document.querySelector(".project-menu-gruop");
    const shareDescription = document.querySelector(".box-wrap.middle .cu-desc");
    if (!breadcrumb || !util || !menu || !shareDescription) return null;
    const breadcrumbBox = breadcrumb.getBoundingClientRect();
    const utilBox = util.getBoundingClientRect();
    const menuBox = menu.getBoundingClientRect();
    const shareDescriptionBox = shareDescription.getBoundingClientRect();
    const headerWrapBox = document.querySelector(".project-header-wrap")!.getBoundingClientRect();
    const watcherCountBox = document.querySelector(".watcher-count")!.getBoundingClientRect();
    const watcherActionBox = document
      .querySelector(".watch-btn .down-arrow")!
      .getBoundingClientRect();
    return {
      menuRight: menuBox.right,
      menuWidth: menuBox.width,
      shareDescriptionLeft: Math.round(shareDescriptionBox.left),
      shareDescriptionRight: Math.floor(shareDescriptionBox.right),
      shareDescriptionWidth: Math.round(shareDescriptionBox.width),
      headerRight: Math.round(headerWrapBox.right),
      utilRight: Math.round(utilBox.right),
      utilWidth: Math.round(utilBox.width),
      watcherActionWidth: Math.round(watcherActionBox.width),
      watcherCountWidth: Math.round(watcherCountBox.width),
      utilAfterBreadcrumb: utilBox.left >= breadcrumbBox.right,
      utilInsideHeader:
        utilBox.right <=
        document.querySelector(".project-header-wrap")!.getBoundingClientRect().right,
    };
  });
  expect(shell).not.toBeNull();
  expect(shell!.menuWidth).toBeCloseTo(573, 0);
  expect(shell!.menuRight).toBeCloseTo(683, 0);
  expect(shell!.shareDescriptionLeft).toBe(239);
  expect(shell!.shareDescriptionRight).toBe(839);
  expect(shell!.shareDescriptionWidth).toBe(601);
  expect(shell!.utilWidth).toBe(147);
  expect(shell!.utilRight).toBe(shell!.headerRight);
  expect(shell!.watcherCountWidth).toBe(30);
  expect(shell!.watcherActionWidth).toBe(102);
  expect(shell!.utilAfterBreadcrumb).toBe(true);
  expect(shell!.utilInsideHeader).toBe(true);
});

test("project settings mobile menu labels preserve legacy wrapping whitespace", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectSettings(page, { project: { isUsingReviewerCount: false } });

  await page.goto(`${basePath}/admin/sample/settingform`);
  await expect(page.locator("#saveSetting")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const bubble = document.querySelector(".bubble-wrap.gray")!;
    const code = document.querySelector("#menuSettingCode")!.closest("label")!;
    const board = document.querySelector("#menuSettingBoard")!.closest("label")!;
    const right = document.querySelector(".setting-box.right")!;
    const textarea = document.querySelector("#project-desc")!;
    const bubbleBox = bubble.getBoundingClientRect();
    const codeBox = code.getBoundingClientRect();
    const boardBox = board.getBoundingClientRect();
    const rightBox = right.getBoundingClientRect();
    const textareaBox = textarea.getBoundingClientRect();
    return {
      boardWrapped: boardBox.top > codeBox.top,
      bubbleHeight: Math.round(bubbleBox.height),
      rightWidth: Math.round(rightBox.width),
      textareaWidth: Math.round(textareaBox.width),
      textareaWidthRule: getComputedStyle(textarea).width,
    };
  });
  expect(metrics.boardWrapped).toBe(true);
  expect(metrics.bubbleHeight).toBe(807);
  test.info().annotations.push({
    type: "mobile-width-evidence",
    description: JSON.stringify({
      rightWidth: metrics.rightWidth,
      textareaWidth: metrics.textareaWidth,
      textareaWidthRule: metrics.textareaWidthRule,
    }),
  });
});

test("project settings description translates legacy textarea autosize behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectSettings(page, { project: { overview: "짧은 프로젝트 설명" } });

  await page.goto(`${basePath}/admin/sample/settingform`);
  const textarea = page.locator("#project-desc");
  await expect(textarea).toBeVisible();

  const initial = await textarea.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      contentHeight: style.height,
      overflow: style.overflow,
      overflowWrap: style.overflowWrap,
      rectHeight: Math.round(element.getBoundingClientRect().height),
      resize: style.resize,
    };
  });
  expect(initial).toEqual({
    contentHeight: "80px",
    overflow: "hidden",
    overflowWrap: "break-word",
    rectHeight: 90,
    resize: "none",
  });

  await textarea.fill(
    "긴 프로젝트 설명이 모바일 너비에서 여러 줄로 자연스럽게 감싸지도록 반복합니다. ".repeat(4),
  );
  await expect
    .poll(() => textarea.evaluate((element) => Number.parseFloat(getComputedStyle(element).height)))
    .toBeGreaterThan(80);
  const expanded = await textarea.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      contentHeight: Number.parseFloat(style.height),
      scrollContentHeight:
        element.scrollHeight -
        Number.parseFloat(style.paddingTop) -
        Number.parseFloat(style.paddingBottom),
    };
  });
  expect(expanded.contentHeight).toBeGreaterThanOrEqual(Math.ceil(expanded.scrollContentHeight));
});

test("project settings matches legacy project/setting.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/settingform`);
  await expect(page).toHaveTitle("Project settings - admin/sample");
  await expect
    .poll(() => page.evaluate(() => document.head.querySelector("title")?.textContent))
    .toBe("Project settings - admin/sample");
  await expect(page.locator("#saveSetting")).toBeVisible();
  await expect(page.locator("#project-default-branch")).toHaveValue("main");
  await expect(page.locator("#project-default-branch")).not.toHaveAttribute("data-toggle", /.+/);
  await expect(page.locator("#project-default-branch")).toHaveAttribute("name", "defaultBranch");
  await expect(page.locator("#project-default-branch")).toHaveAttribute("data-format", "branch");
  await expect(page.locator("#project-default-branch")).toHaveAttribute(
    "data-dropdown-css-class",
    "branches",
  );
  await expect(page.locator("#project-default-branch")).toHaveAttribute(
    "style",
    "min-width: 220px;",
  );
  await expect(page.locator("#project-default-branch option")).toHaveText(["main", "develop"]);
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  await expect(page.locator('.user-menu-wrap .user-menu a[href$="/admin"]')).not.toHaveAttribute(
    "class",
    /(?:^|\s)active(?:\s|$)/,
  );
  expect(
    await page
      .locator(
        ".unsupported, [data-stylex-owner=global-gnb-outer], .project-header-outer, .project-menu-outer, .page-wrap-outer, [data-stylex-owner=site-footer]",
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
    "page-wrap-outer",
    "site-footer",
  ]);

  expect(await projectHeaderMetrics(page)).toEqual({
    avatarHeight: 90,
    avatarTopOffsetFromHeaderBottom: -60,
    avatarWidth: 90,
    headerHeight: 120,
    headerInnerHeight: 120,
    menuHeight: 40,
    menuTopOffsetFromHeaderBottom: 0,
    wrapHeight: 120,
    wrapWidthRatio: 0.97,
  });
  expect(await projectSettingMetrics(page)).toMatchObject({
    bubbleBackground: "rgb(247, 247, 247)",
    bubbleBorderRadius: "5px",
    defaultBranchName: "defaultBranch",
    formAction: `${basePath}/admin/sample/setting`,
    formEnctype: "multipart/form-data",
    formMethod: "post",
    hiddenId: "7",
    logoHeight: 188,
    logoWidth: 260,
    menuSettingName: "pullRequest",
    saveTextAlign: "center",
    shareDescriptionLeft: 239,
    shareDescriptionRight: 1097,
    shareDescriptionWidth: 859,
    textareaHeight: 90,
    watchingCount: "5",
  });
});

test("project settings project name popover is React-owned on hover and focus", async ({
  page,
}) => {
  test.info().annotations.push({
    type: "gap",
    description:
      "Live legacy visual confirmation was unavailable in this worker run; assertions are Scala HTML, Bootstrap/Yobi LESS, and browser-metric derived.",
  });
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/settingform`);

  const projectName = page.locator("#project-name");
  await expect(projectName).toBeVisible();
  await expect(projectName).toHaveAttribute("name", "name");
  await expect(projectName).toHaveAttribute("maxlength", "250");
  await expect(projectName).toHaveValue("sample");
  await expect(projectName).not.toHaveAttribute("data-content");
  await expect(projectName).not.toHaveAttribute("data-placement");
  await expect(projectName).not.toHaveAttribute("data-trigger");
  await expect(page.locator(".setting-box.right .popover")).toHaveCount(0);

  await projectName.hover();
  const hoverPopover = page.locator(".setting-box.right .popover.left");
  await expect(hoverPopover).toBeVisible();
  await expect(hoverPopover).toHaveClass(/(?:^|\s)left(?:\s|$)/);
  await expect(hoverPopover).toHaveClass(/(?:^|\s)in(?:\s|$)/);
  await expect(hoverPopover.locator(".popover-title")).toHaveText("");
  await expect(hoverPopover.locator(".popover-content")).toHaveText(
    "Also, previous links are available. After changing, during the first 24 hours, you can rename or transfer freely as many times as you want without breaking previous links. The previous URL will be fixed and preserved for 24 hours.",
  );
  expect(await projectNamePopoverMetrics(page)).toMatchObject({
    arrowCenteredVertically: true,
    inputKeptInsideRightColumn: true,
    placement: "left",
    popoverLeftOfInput: true,
    popoverVisible: true,
    titleHidden: true,
  });

  await page.mouse.move(0, 0);
  await expect(hoverPopover).toHaveCount(0);

  await projectName.focus();
  const focusPopover = page.locator(".setting-box.right .popover.left");
  await expect(focusPopover).toBeVisible();
  await expect(focusPopover.locator(".popover-content")).toHaveText(
    "Also, previous links are available. After changing, during the first 24 hours, you can rename or transfer freely as many times as you want without breaking previous links. The previous URL will be fixed and preserved for 24 hours.",
  );
  expect(await projectNamePopoverMetrics(page)).toMatchObject({
    placement: "left",
    popoverLeftOfInput: true,
    popoverVisible: true,
  });

  await projectName.blur();
  await expect(focusPopover).toHaveCount(0);
});

test("project SVN settings omit Git-only setting controls while preserving legacy shell", async ({
  page,
}) => {
  test.info().annotations.push({
    type: "gap",
    description:
      "Live legacy visual confirmation was unavailable in this run; assertions are Scala HTML/LESS source and browser-metric derived.",
  });
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const branchRequests: string[] = [];
  await mockProjectSettings(page, {
    branchRequests,
    projectName: "svnplayground",
    project: {
      menuSetting: {
        board: true,
        code: true,
        issue: true,
        milestone: true,
        pullRequest: true,
        review: true,
      },
      projectName: "svnplayground",
      showPullRequest: true,
      vcs: "SVN",
    },
  });

  await page.goto(`${basePath}/admin/svnplayground/settingform`);

  await expect(page).toHaveTitle("Project settings - admin/svnplayground");
  await expect(page.locator("#saveSetting")).toBeVisible();
  await expect(page.locator("#subMenuProjectSetting")).toHaveClass("active");
  await expect(page.locator(".project-setting li")).toHaveClass("active");
  await expect(page.locator(".project-breadcrumb .project-name a")).toHaveText("svnplayground");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/admin/svnplayground/search`,
  );
  expect(await navbarSearchContainmentMetrics(page)).toMatchObject({
    inputInsideNavbar: true,
    scopeInsideNavbar: true,
    searchBoxInsideForm: true,
  });

  await expect(page.locator("#project-default-branch")).toHaveCount(0);
  await expect(page.locator("#defaultBranceSettingPanel")).toHaveCount(0);
  await expect(page.locator("#reviewerCountSettingPanel")).toHaveCount(0);
  await expect(page.locator("#welReviewerCount")).toHaveCount(0);
  await expect(page.locator("#menuSettingPullRequest")).toHaveCount(0);
  await expect(page.locator('.cu-desc .ybtn[target="_blank"]')).toHaveCount(0);
  await expect(page.locator(".box-wrap.middle", { hasText: "Issue Template" })).toHaveCount(0);
  await expect(page.locator(".project-menu-gruop a", { hasText: "Pull request" })).toHaveCount(0);

  await expect(page.locator(".box-wrap.middle > .cu-label")).toHaveText([
    "Share Options",
    "Only project members can access code or related menus",
    "Menu Setting",
  ]);
  await expect(page.locator(".box-wrap.middle:last-of-type .inline-list")).toHaveText([
    "Code",
    "Issue",
    "Review",
    "Milestone",
    "Board",
  ]);
  await expect(page.locator("#subMenuProjectChangeVCS")).toBeVisible();
  await expect(page.locator("#subMenuProjectChangeVCS a")).toHaveAttribute(
    "href",
    `${basePath}/admin/svnplayground/changeVCS`,
  );

  expect(await projectNonGitSettingMetrics(page)).toMatchObject({
    formAction: `${basePath}/admin/svnplayground/setting`,
    hasDefaultBranchPayload: false,
    hasDefaultReviewerCountPayload: false,
    hasPullRequestPayload: false,
    hasReviewerCountPayload: false,
    menuCheckboxOrder: ["code", "issue", "review", "milestone", "board"],
    middleLabels: [
      "Share Options",
      "Only project members can access code or related menus",
      "Menu Setting",
    ],
    shellContained: true,
    topColumnsDoNotOverlap: true,
  });
  expect(branchRequests).toEqual([]);
});

test("project settings renders legacy old-place notice below the project name", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page, {
    project: {
      hasOldPlace: true,
      previous: {
        place: {
          description: "old-admin/old-sample",
        },
      },
    },
  });

  await page.goto(`${basePath}/admin/sample/settingform`);

  const nameFieldWrap = page.locator("#project-name").locator("..");
  const oldPlaceNotice = nameFieldWrap.locator("div");
  await expect(oldPlaceNotice).toHaveText("This project was moved from old-admin/old-sample");
  await expect(oldPlaceNotice.locator("span")).toHaveText("old-admin/old-sample");
  await expect(oldPlaceNotice.locator("span")).toHaveAttribute("style", "color: red;");
  expect(
    await nameFieldWrap.evaluate((element) =>
      Array.from(element.childNodes).map((node) =>
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element).tagName.toLowerCase()
          : node.textContent,
      ),
    ),
  ).toEqual(["input", "div", "br"]);
});

test("project settings menu links preserve legacy hrefs with SPA transition", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectSettingsTabAnchorListeners", {
      configurable: true,
      value: [] as string[],
    });
    Element.prototype.addEventListener = function addEventListenerWithSettingsTabAudit(
      type,
      listener,
      options,
    ) {
      if (this.matches(".project-page-wrap > .nav.nav-tabs a")) {
        (
          window as Window & typeof globalThis & { __projectSettingsTabAnchorListeners: string[] }
        ).__projectSettingsTabAnchorListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/settingform`);
  const settingsTabs = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(settingsTabs).toHaveCount(7);
  await expect(settingsTabs).toHaveText([
    "Settings",
    "Member",
    "Issue Label",
    "Webhooks",
    "Transfer",
    "Delete project",
    "Repository Type Change",
  ]);
  expect(
    await settingsTabs.evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
  ).toEqual([
    `${basePath}/admin/sample/settingform`,
    `${basePath}/admin/sample/members`,
    `${basePath}/admin/sample/issue/labelsform`,
    `${basePath}/admin/sample/webhooks`,
    `${basePath}/admin/sample/transfer`,
    `${basePath}/admin/sample/deleteform`,
    `${basePath}/admin/sample/changeVCS`,
  ]);
  expect(
    await settingsTabs.evaluateAll((links) =>
      links.map((link) => ({
        ariaCurrent: link.getAttribute("aria-current"),
        className: link.getAttribute("class"),
        dataStatus: link.getAttribute("data-status"),
      })),
    ),
  ).toEqual([
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
    { ariaCurrent: null, className: null, dataStatus: null },
  ]);
  await expect(page.locator("#subMenuProjectSetting")).toHaveClass("active");
  await expect(page.locator(".project-setting li")).toHaveClass("active");
  await expect(page.locator(".project-setting li.active a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/setting`,
  );
  expect(
    await page.locator(".project-setting li.active a").evaluate((link) => ({
      ariaCurrent: link.getAttribute("aria-current"),
      className: link.getAttribute("class"),
      dataStatus: link.getAttribute("data-status"),
      text: link.textContent?.trim(),
    })),
  ).toEqual({
    ariaCurrent: null,
    className: null,
    dataStatus: null,
    text: "Project configuration",
  });
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __projectSettingsTabAnchorListeners?: string[] })
          .__projectSettingsTabAnchorListeners ?? [],
    ),
  ).toEqual([]);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const memberLink = page.locator("#subMenuProjectMember a");
  await memberLink.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/members`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#subMenuProjectMember")).toHaveClass("active");
  await expect(page.locator(".members.project .member")).toHaveCount(2);
});

test("project settings member badges use enrolled-user count from legacy menus", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page, {
    project: {
      enrolledUsers: [{ id: 1 }, { id: 2 }],
      enrollmentRequestCount: 5,
    },
  });

  await page.goto(`${basePath}/admin/sample/settingform`);

  const submenuBadge = page.locator("#subMenuProjectMember .num-badge");
  await expect(submenuBadge).toHaveText("2");
  await expect(page.locator("#subMenuProjectMember a")).toHaveText("Member2");
  await expect(page.locator("#subMenuProjectMember a")).not.toHaveText("Member5");

  const adminBadge = page.locator(".project-setting .project-menu-count");
  await expect(adminBadge).toHaveText("2");
  await expect(page.locator(".project-setting a")).not.toHaveText("5");
});

test("project settings project links render legacy hrefs and navigate through SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page, {
    project: {
      isForkedFromOrigin: true,
      originalOwnerName: "upstream",
      originalProjectName: "origin",
    },
  });

  await page.goto(`${basePath}/admin/sample/settingform`);
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveAttribute(
    "href",
    `${basePath}/admin`,
  );
  await expect(page.locator(".project-breadcrumb .project-name a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(page.locator(".project-origin .project-origin-title")).toHaveText("Forked from");
  await expect(page.locator(".project-origin a.project-origin-name")).toHaveAttribute(
    "href",
    `${basePath}/upstream/origin`,
  );
  await expect(page.locator(".project-menu-gruop a").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample`,
  );
  await expect(page.locator(".project-setting li.active a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/setting`,
  );
  await expect(page.locator('.cu-desc .ybtn[target="_blank"]')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?issueTemplate=true`,
  );
  await expect(page.locator("#subMenuIssueLabel a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(page.locator("#subMenuIssueLabel a")).not.toHaveAttribute(
    "href",
    `${basePath}/admin/sample/labels`,
  );
  expect(
    await page
      .locator(
        ".project-breadcrumb .project-author a, .project-breadcrumb .project-name a, .project-origin a.project-origin-name, .cu-desc .ybtn[target='_blank']",
      )
      .evaluateAll((links) =>
        links.map((link) => ({
          ariaCurrent: link.getAttribute("aria-current"),
          className: link.getAttribute("class"),
          dataStatus: link.getAttribute("data-status"),
          href: link.getAttribute("href"),
          target: link.getAttribute("target"),
          text: link.textContent?.trim(),
          title: link.getAttribute("title"),
        })),
      ),
  ).toEqual([
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin`,
      target: null,
      text: "admin",
      title: null,
    },
    {
      ariaCurrent: null,
      className: null,
      dataStatus: null,
      href: `${basePath}/admin/sample`,
      target: null,
      text: "sample",
      title: null,
    },
    {
      ariaCurrent: null,
      className: "project-origin-name",
      dataStatus: null,
      href: `${basePath}/upstream/origin`,
      target: null,
      text: "upstream / origin",
      title: null,
    },
    {
      ariaCurrent: null,
      className: "ybtn",
      dataStatus: null,
      href: `${basePath}/admin/sample/postform?issueTemplate=true`,
      target: "_blank",
      text: "Edit",
      title: null,
    },
  ]);
  expect(
    await page.locator(".project-menu-gruop li").evaluateAll((items) =>
      items.map((item) => {
        const link = item.querySelector("a");
        return {
          anchorAriaCurrent: link?.getAttribute("aria-current") ?? null,
          anchorClassName: link?.getAttribute("class") ?? null,
          anchorDataStatus: link?.getAttribute("data-status") ?? null,
          anchorHref: link?.getAttribute("href") ?? null,
          anchorTarget: link?.getAttribute("target") ?? null,
          anchorText: link?.textContent?.trim() ?? null,
          anchorTitle: link?.getAttribute("title") ?? null,
          liClassName: item.getAttribute("class"),
        };
      }),
    ),
  ).toEqual([
    {
      anchorAriaCurrent: null,
      anchorClassName: null,
      anchorDataStatus: null,
      anchorHref: `${basePath}/admin/sample`,
      anchorTarget: null,
      anchorText: "Project homeH",
      anchorTitle: null,
      liClassName: "",
    },
    {
      anchorAriaCurrent: null,
      anchorClassName: null,
      anchorDataStatus: null,
      anchorHref: `${basePath}/admin/sample/code`,
      anchorTarget: null,
      anchorText: "CodeC",
      anchorTitle: null,
      liClassName: "code-menu ",
    },
    {
      anchorAriaCurrent: null,
      anchorClassName: null,
      anchorDataStatus: null,
      anchorHref: `${basePath}/admin/sample/issues`,
      anchorTarget: null,
      anchorText: "IssueI",
      anchorTitle: null,
      liClassName: "",
    },
    {
      anchorAriaCurrent: null,
      anchorClassName: null,
      anchorDataStatus: null,
      anchorHref: `${basePath}/admin/sample/pullRequests`,
      anchorTarget: null,
      anchorText: "Pull requestP",
      anchorTitle: null,
      liClassName: "",
    },
    {
      anchorAriaCurrent: null,
      anchorClassName: null,
      anchorDataStatus: null,
      anchorHref: `${basePath}/admin/sample/reviews`,
      anchorTarget: null,
      anchorText: "ReviewR",
      anchorTitle: null,
      liClassName: "",
    },
    {
      anchorAriaCurrent: null,
      anchorClassName: null,
      anchorDataStatus: null,
      anchorHref: `${basePath}/admin/sample/milestones`,
      anchorTarget: null,
      anchorText: "MilestoneM",
      anchorTitle: null,
      liClassName: "",
    },
    {
      anchorAriaCurrent: null,
      anchorClassName: null,
      anchorDataStatus: null,
      anchorHref: `${basePath}/admin/sample/posts`,
      anchorTarget: null,
      anchorText: "BoardB",
      anchorTitle: null,
      liClassName: "",
    },
  ]);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await page.locator(".project-menu-gruop a", { hasText: "Board" }).click();

  await expect
    .poll(() => page.evaluate(() => window.location.pathname))
    .toBe(`${basePath}/admin/sample/posts`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("project settings route source keeps internal navigation on Link", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName/setting.tsx", import.meta.url),
    "utf8",
  );
  const settingFormSource = await readFile(
    new URL("../src/routes/$ownerName/$projectName/settingform.tsx", import.meta.url),
    "utf8",
  );

  expect(source).not.toMatch(/<a\b[^>]*href=\{?(?:prefixBasePath|projectHref)/);
  expect(source).not.toMatch(/<a\b[^>]*href=["']\/[^"']*["']/);
  expect(source).not.toMatch(/<a\b/);
  expect(source).not.toContain("createLink");
  expect(source).not.toContain("setAttribute(");
  expect(source).not.toContain("removeAttribute(");
  expect(source).not.toContain("logoInputRef");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).not.toContain("window.document");
  expect(source).not.toMatch(/\.current\.value\s*=/);
  expect(source).not.toMatch(/currentTarget\.value\s*=/);
  expect(source).not.toMatch(/\b(?:document|window\.document)\.(?:querySelector|getElementById)/);
  expect(source).not.toContain("addEventListener(");
  expect(source).not.toContain("classList.");
  expect(source).not.toContain("style.display");
  expect(source).not.toContain("dangerouslySetInnerHTML");
  expect(source).not.toContain("innerHTML");
  expect(source).not.toContain('data-content={t("project.transfer.description6")}');
  expect(source).not.toContain('data-placement="left"');
  expect(source).not.toContain('data-trigger="focus"');
  expect(source).not.toMatch(
    /<select[\s\S]*?id="project-default-branch"[\s\S]*?data-toggle="select2"[\s\S]*?>/,
  );
  expect(source).not.toMatch(
    /<button[\s\S]*?className="btn dropdown-toggle large"[\s\S]*?data-toggle="dropdown"[\s\S]*?>/,
  );
  expect(source).not.toContain('data-id="project-reviewer-count"');
  expect(source).not.toContain('data-name="defaultReviewerCount"');
  expect(source).not.toMatch(
    /<div[\s\S]*?id="welReviewerCount"[\s\S]*?data-value=\{?String\(booleanField/,
  );
  expect(source).toContain('name="defaultReviewerCount"');
  expect(source).toContain("setProjectNamePopoverFocused");
  expect(source).toContain("setProjectNamePopoverHovered");
  expect(source).toContain('className="popover left in"');
  expect(source).not.toMatch(/href=["'](?:#|javascript:)/);
  expect(source).not.toContain("activeProps={{ className: undefined }}");
  expect(source).not.toContain("as never");
  expect(source).not.toContain("search={(current) => current}");
  expect(source).not.toContain("/$ownerName/$projectName/labels");
  expect(source).toContain("const legacyProjectSettingsLinkActiveOptions = {");
  expect(source).toContain("explicitUndefined: true");
  expect(source).toContain("const legacyProjectSettingsLinkSuppressActiveProps = {");
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain("className: undefined");
  expect(source).toContain('"data-status": undefined');
  expect(source).toContain(
    'const LEGACY_PROJECT_SETTINGS_ROUTE = "/$ownerName/$projectName/settingform"',
  );
  expect(source).toContain('to="/$ownerName/$projectName/issue/labelsform"');
  expect(source).toContain('target="_blank"');
  expect(source).toContain("const isGitProject = project ?");
  expect(source).toContain("readProjectContainerQueryOptions");
  expect(source).toContain("ProjectMenu as SharedProjectMenu");
  expect(source).not.toContain("function ProjectMenu(");
  expect(source).toContain("enabled: isGitProject");
  expect(source).toContain("{isGit ? (");
  expect(source).toContain(
    '<title>{`${t("title.projectSetting")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(source).toContain('createFileRoute("/$ownerName/$projectName/setting")');
  expect(source).toContain("selfRoutePath={LEGACY_PROJECT_SETTINGS_ROUTE}");
  expect(settingFormSource).toContain('createFileRoute("/$ownerName/$projectName/settingform")');
  expect(settingFormSource).toContain("ProjectSettingRouteScreen");
});

test("project settings navbar search scope matches legacy projectLayout common navbar", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/settingform`);

  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  const searchForm = page.locator('form[name="gnb-search-form"]');
  await expect(searchForm).toHaveAttribute("action", `${basePath}/admin/sample/search`);
  await expect(searchForm.locator('input[name="searchType"]')).toHaveValue("auto");
  const searchBox = searchForm.locator('[data-stylex-owner="global-gnb-search-box"]');
  await expect(searchBox).not.toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).not.toHaveClass(/\bselect\b/);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(
    page.locator('.gnb-search-form a[href="#"][data-toggle="search-scope"]'),
  ).toHaveCount(0);
  const scopeControls = page.locator(
    '[data-stylex-owner=global-gnb-search-scope-item] > button[type="button"]',
  );
  await expect(scopeControls).toHaveCount(2);
  await expect(scopeControls.nth(0)).toHaveText("This Project");
  await expect(scopeControls.nth(1)).toHaveText("All Projects");
  await expect(scopeControls.nth(0)).not.toHaveAttribute("data-action", /.+/);
  await expect(scopeControls.nth(1)).not.toHaveAttribute("data-action", /.+/);

  await page.locator("#gnb-search-scope-title").click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-stylex-owner=global-gnb-search-scope-menu]")).toBeVisible();

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await scopeControls.nth(1).click();
  await expect(searchForm).toHaveAttribute("action", `${basePath}/search`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("org-owned project settings exposes legacy group search scope without leaving route", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page, {
    ownerName: "weblabs",
    project: {
      isProtected: true,
      organizationName: "weblabs",
      ownerName: "weblabs",
      projectName: "portal",
      projectScope: "PROTECTED",
    },
    projectName: "portal",
  });

  await page.goto(`${basePath}/weblabs/portal/settingform`);

  await expect(page.locator("#saveSetting")).toBeVisible();
  await expect(page).toHaveURL(`${basePath}/weblabs/portal/settingform`);
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".project-breadcrumb .project-author a")).toHaveText("weblabs");
  await expect(page.locator(".project-breadcrumb .project-name a")).toHaveText("portal");

  const searchForm = page.locator('form[name="gnb-search-form"]');
  await expect(searchForm).toHaveAttribute("action", `${basePath}/weblabs/portal/search`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");

  const scopeControls = page.locator(
    '[data-stylex-owner=global-gnb-search-scope-item] > button[type="button"]',
  );
  await expect(scopeControls).toHaveCount(3);
  await expect(scopeControls).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(scopeControls.nth(0)).not.toHaveAttribute("data-action", /.+/);
  await expect(scopeControls.nth(1)).not.toHaveAttribute("data-action", /.+/);
  await expect(scopeControls.nth(2)).not.toHaveAttribute("data-action", /.+/);

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await page.locator("#gnb-search-scope-title").click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveAttribute("aria-expanded", "true");
  await scopeControls.nth(1).click();
  await expect(searchForm).toHaveAttribute("action", `${basePath}/organizations/weblabs/search`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page).toHaveURL(`${basePath}/weblabs/portal/settingform`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  expect(await navbarSearchContainmentMetrics(page)).toMatchObject({
    inputInsideNavbar: true,
    searchBoxInsideForm: true,
    scopeInsideNavbar: true,
  });
});

test("project settings header favorite star posts and toggles starred class", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectFavoriteSpanListeners", {
      configurable: true,
      value: [] as string[],
    });
    Element.prototype.addEventListener = function addEventListenerWithFavoriteSpanAudit(
      type,
      listener,
      options,
    ) {
      if (this.matches(".project-breadcrumb .user-project-list")) {
        (
          window as Window & typeof globalThis & { __projectFavoriteSpanListeners: string[] }
        ).__projectFavoriteSpanListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
  await mockProjectSettings(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/settingform`);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).not.toHaveClass(/starred/);
  await expect(
    page.locator('.project-breadcrumb .user-project-list[data-project-id="7"]'),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __projectFavoriteSpanListeners?: string[] })
          .__projectFavoriteSpanListeners ?? [],
    ),
  ).toEqual([]);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).toHaveClass(/starred/);
  expect(
    await page.evaluate(
      () =>
        (window as Window & typeof globalThis & { __projectFavoriteSpanListeners?: string[] })
          .__projectFavoriteSpanListeners ?? [],
    ),
  ).toEqual([]);
});

test("project settings header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectSettings(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: {
      isFavorited: true,
    },
  });

  await page.goto(`${basePath}/admin/sample/settingform`);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page.locator(".project-breadcrumb .user-project-list i")).not.toHaveClass(/starred/);
});

test("project settings reviewer count radios mirror legacy show/hide behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/settingform`);

  await expect(page.locator('.reviewer-count-wrap [data-toggle="reviewer-count"]')).toHaveCount(0);
  await expect(page.locator('.reviewer-count-wrap [data-action="show"]')).toHaveCount(0);
  await expect(page.locator('.reviewer-count-wrap [data-action="hide"]')).toHaveCount(0);
  await expect(page.locator("#reviewerCountEnable")).not.toHaveAttribute("data-toggle", /.+/);
  await expect(page.locator("#reviewerCountDisable")).not.toHaveAttribute("data-toggle", /.+/);
  await expect(page.locator("#reviewerCountEnable")).not.toHaveAttribute("data-action", /.+/);
  await expect(page.locator("#reviewerCountDisable")).not.toHaveAttribute("data-action", /.+/);
  await expect(page.locator("#reviewerCountEnable")).toHaveAttribute(
    "name",
    "isUsingReviewerCount",
  );
  await expect(page.locator("#reviewerCountDisable")).toHaveAttribute(
    "name",
    "isUsingReviewerCount",
  );
  await expect(page.locator("#reviewerCountEnable")).toHaveAttribute("value", "true");
  await expect(page.locator("#reviewerCountDisable")).toHaveAttribute("value", "false");
  await expect(page.locator("#welReviewerCount")).toHaveCount(1);
  await expect(page.locator("#welReviewerCount")).not.toHaveAttribute("data-value", /.+/);
  await expect(page.locator("#welReviewerCount")).toBeVisible();
  await page.locator("#reviewerCountDisable").check();
  await expect(page.locator("#reviewerCountDisable")).toBeChecked();
  await expect(page.locator("#welReviewerCount")).toBeHidden();
  await page.locator("#reviewerCountEnable").check();
  await expect(page.locator("#reviewerCountEnable")).toBeChecked();
  await expect(page.locator("#welReviewerCount")).toBeVisible();
});

test("project settings reviewer count dropdown uses route-local open state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/settingform`);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.sessionStorage.setItem("__yonaSessionMarker", "kept");
  });

  const reviewerDropdown = page.locator(
    ".reviewer-count-wrap #welReviewerCount > .btn-group.branches",
  );
  const toggle = reviewerDropdown.locator("button.btn.dropdown-toggle.large");
  const options = reviewerDropdown.locator(".dropdown-menu li");
  const defaultBranch = page.locator("#project-default-branch");

  await expect(defaultBranch).not.toHaveAttribute("data-toggle", /.+/);
  await expect(defaultBranch).toHaveAttribute("name", "defaultBranch");
  await expect(defaultBranch).toHaveAttribute("data-format", "branch");
  await expect(defaultBranch).toHaveAttribute("data-dropdown-css-class", "branches");
  await expect(defaultBranch).toHaveValue("main");
  await expect(reviewerDropdown).toHaveClass(/(^| )btn-group( |$)/);
  await expect(reviewerDropdown).toHaveClass(/(^| )branches( |$)/);
  await expect(reviewerDropdown).toHaveAttribute(
    "data-stylex-owner",
    "project-reviewer-count-dropdown",
  );
  await expect(reviewerDropdown).not.toHaveAttribute("data-id", /.+/);
  await expect(reviewerDropdown).not.toHaveAttribute("data-name", /.+/);
  await expect(
    page.locator('.reviewer-count-wrap .btn-group.branches[data-name="defaultReviewerCount"]'),
  ).toHaveCount(0);
  await expect(toggle).not.toHaveAttribute("data-toggle", /.+/);
  await expect(toggle.locator(".d-label")).toHaveText("2");
  await expect(page.locator('input[type="hidden"][name="defaultReviewerCount"]')).toHaveValue("2");
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveAttribute("data-value", "1");
  await expect(options.nth(1)).toHaveAttribute("data-value", "2");
  await expect(options.nth(2)).toHaveAttribute("data-value", "3");
  await expect(reviewerDropdown.locator(".dropdown-menu button[type=button]")).toHaveText([
    "1",
    "2",
    "3",
  ]);
  await expect(reviewerDropdown.locator(".dropdown-menu a")).toHaveCount(0);
  await expect(reviewerDropdown.locator(".dropdown-menu button:not([type=button])")).toHaveCount(0);

  await expect
    .poll(() =>
      reviewerDropdown.evaluate((element) => {
        const toggle = element.querySelector<HTMLButtonElement>("button.dropdown-toggle");
        const menu = element.querySelector<HTMLUListElement>(".dropdown-menu");
        const item = element.querySelector<HTMLElement>(".dropdown-menu li");
        const label = element.querySelector<HTMLElement>(".d-label");
        const caretWrap = element.querySelector<HTMLElement>(".d-caret");
        const caret = element.querySelector<HTMLElement>(".caret");
        if (!toggle || !menu || !item || !label || !caretWrap || !caret) {
          throw new Error("Missing reviewer dropdown owner");
        }
        const toggleStyle = getComputedStyle(toggle);
        const menuStyle = getComputedStyle(menu);
        const itemStyle = getComputedStyle(item);
        const labelStyle = getComputedStyle(label);
        const caretWrapStyle = getComputedStyle(caretWrap);
        const caretStyle = getComputedStyle(caret);
        return {
          toggle: {
            backgroundColor: toggleStyle.backgroundColor,
            display: toggleStyle.display,
            lineHeight: toggleStyle.lineHeight,
            marginLeft: toggleStyle.marginLeft,
            paddingLeft: toggleStyle.paddingLeft,
            position: toggleStyle.position,
            whiteSpace: toggleStyle.whiteSpace,
          },
          label: {
            display: labelStyle.display,
            float: labelStyle.float,
            overflow: labelStyle.overflow,
            paddingRight: labelStyle.paddingRight,
            paddingTop: labelStyle.paddingTop,
            width: labelStyle.width,
          },
          caretWrap: {
            float: caretWrapStyle.float,
            paddingRight: caretWrapStyle.paddingRight,
            paddingTop: caretWrapStyle.paddingTop,
          },
          caret: {
            borderTopColor: caretStyle.borderTopColor,
            display: caretStyle.display,
            height: caretStyle.height,
            verticalAlign: caretStyle.verticalAlign,
            width: caretStyle.width,
          },
          menu: {
            borderRadius: menuStyle.borderRadius,
            display: menuStyle.display,
            float: menuStyle.float,
            minWidth: menuStyle.minWidth,
            overflow: menuStyle.overflow,
            padding: menuStyle.padding,
            position: menuStyle.position,
          },
          itemMarginBottom: itemStyle.marginBottom,
        };
      }),
    )
    .toEqual({
      toggle: {
        backgroundColor: "rgb(255, 255, 255)",
        display: "inline-block",
        lineHeight: "20px",
        marginLeft: "4.2px",
        paddingLeft: "12px",
        position: "relative",
        whiteSpace: "nowrap",
      },
      label: {
        display: "block",
        float: "left",
        overflow: "hidden",
        paddingRight: "9px",
        paddingTop: "4px",
        width: "116px",
      },
      caretWrap: {
        float: "right",
        paddingRight: "9px",
        paddingTop: "4px",
      },
      caret: {
        borderTopColor: "rgb(79, 79, 79)",
        display: "inline-block",
        height: "0px",
        verticalAlign: "top",
        width: "0px",
      },
      menu: {
        borderRadius: "2px",
        display: "none",
        float: "none",
        minWidth: "160px",
        overflow: "hidden",
        padding: "0px",
        position: "absolute",
      },
      itemMarginBottom: "1px",
    });

  await toggle.click();
  await expect(reviewerDropdown).toHaveClass(/(^| )btn-group( |$)/);
  await expect(reviewerDropdown).toHaveClass(/(^| )branches( |$)/);
  await expect(reviewerDropdown).toHaveClass(/(^| )open( |$)/);
  await expect
    .poll(() =>
      reviewerDropdown.evaluate((element) => {
        const toggle = element.querySelector<HTMLElement>("button.dropdown-toggle");
        const menu = element.querySelector<HTMLElement>(".dropdown-menu");
        if (!toggle || !menu) throw new Error("Missing reviewer dropdown geometry");
        const toggleBox = toggle.getBoundingClientRect();
        const menuBox = menu.getBoundingClientRect();
        return {
          menuDisplay: getComputedStyle(menu).display,
          menuFloat: getComputedStyle(menu).float,
          menuPosition: getComputedStyle(menu).position,
          menuInsideGroup: menuBox.left >= element.getBoundingClientRect().left,
          menuBelowToggle: menuBox.top >= toggleBox.bottom,
          toggleOpenBackground: getComputedStyle(toggle).backgroundColor,
        };
      }),
    )
    .toEqual({
      menuDisplay: "block",
      menuFloat: "none",
      menuPosition: "absolute",
      menuInsideGroup: true,
      menuBelowToggle: true,
      toggleOpenBackground: "rgb(242, 242, 242)",
    });
  await expect(page).toHaveURL(`${basePath}/admin/sample/settingform`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("__yonaSessionMarker")))
    .toBe("kept");

  await options.nth(2).locator("button").click();
  await expect(reviewerDropdown).toHaveClass(/(^| )btn-group( |$)/);
  await expect(reviewerDropdown).toHaveClass(/(^| )branches( |$)/);
  await expect(toggle.locator(".d-label")).toHaveText("3");
  await expect(page.locator('input[name="defaultReviewerCount"]')).toHaveValue("3");
  await expect(page).toHaveURL(`${basePath}/admin/sample/settingform`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("__yonaSessionMarker")))
    .toBe("kept");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileReviewerDropdown = page.locator(
    ".reviewer-count-wrap #welReviewerCount > .btn-group.branches",
  );
  await expect(mobileReviewerDropdown).toBeVisible();
  await mobileReviewerDropdown.locator("button.btn.dropdown-toggle.large").click();
  await expect(mobileReviewerDropdown.locator(".dropdown-menu")).toBeVisible();
  await expect
    .poll(() =>
      mobileReviewerDropdown.evaluate((element) => {
        const menu = element.querySelector<HTMLElement>(".dropdown-menu");
        if (!menu) throw new Error("Missing mobile reviewer menu");
        const menuBox = menu.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        return { menuWithinViewport: menuBox.left >= 0 && menuBox.right <= viewportWidth };
      }),
    )
    .toEqual({ menuWithinViewport: true });
});

test("project settings default branch uses the legacy Select2 shell and syncs its mutation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const defaultBranchRequests: {
    body: Record<string, unknown>;
    hasCsrfToken: boolean;
    method: string;
  }[] = [];
  await mockProjectSettings(page, { defaultBranchRequests });

  await page.goto(`${basePath}/admin/sample/settingform`);

  const nativeSelect = page.locator("#project-default-branch");
  const select2 = page.locator("#s2id_project-default-branch.select2-container");
  const choice = select2.locator("button.select2-choice");
  await expect(select2).toBeVisible();
  await expect(choice).toContainText("branch main");
  await expect(choice.locator(".branch-label.branch")).toHaveText("branch");
  await expect(choice.locator(".select2-arrow > b")).toHaveCount(1);
  await expect(nativeSelect).toHaveClass("select2-offscreen");
  await expect(nativeSelect).toHaveValue("main");

  const geometry = await page.evaluate(() => {
    const container = document.querySelector("#s2id_project-default-branch")!;
    const choice = container.querySelector(".select2-choice")!;
    const nativeSelect = document.querySelector("#project-default-branch")!;
    const containerBox = container.getBoundingClientRect();
    const choiceBox = choice.getBoundingClientRect();
    const nativeSelectStyle = getComputedStyle(nativeSelect);
    return {
      choiceHeight: choiceBox.height,
      choiceWidth: choiceBox.width,
      containerHeight: containerBox.height,
      containerWidth: containerBox.width,
      nativeSelectClip: nativeSelectStyle.clip,
      nativeSelectPosition: nativeSelectStyle.position,
    };
  });
  expect(geometry.containerWidth).toBeCloseTo(220, 0);
  expect(geometry.containerHeight).toBeCloseTo(30, 0);
  expect(geometry.choiceWidth).toBeCloseTo(218, 0);
  expect(geometry.choiceHeight).toBeCloseTo(28, 0);
  expect(geometry.nativeSelectPosition).toBe("absolute");
  expect(geometry.nativeSelectClip).not.toBe("auto");

  await choice.click();
  await expect(select2).toHaveClass(/select2-dropdown-open/);
  await expect(choice).toHaveAttribute("aria-expanded", "true");
  const options = select2.locator(".select2-results .select2-result-label");
  await expect(options).toHaveText(["branch main", "branch develop"]);
  await options.nth(1).click();
  await expect(select2).not.toHaveClass(/select2-dropdown-open/);
  await expect(choice).toContainText("branch develop");
  await expect(nativeSelect).toHaveValue("develop");

  const defaultBranchResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/branches/default") &&
      response.request().method() === "POST",
  );
  await page.locator("#save").click();
  await defaultBranchResponse;
  expect(defaultBranchRequests).toEqual([
    { body: { branchName: "develop" }, hasCsrfToken: true, method: "POST" },
  ]);
});

test("project settings menu checkboxes mirror legacy dependency behavior", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.goto(`${basePath}/admin/sample/settingform`);

  await page.locator("#menuSettingCode").uncheck();
  await expect(page.locator("#menuSettingCode")).not.toBeChecked();
  await expect(page.locator("#menuSettingPullRequest")).not.toBeChecked();
  await expect(page.locator("#menuSettingReview")).not.toBeChecked();
  await expect(page.locator("#reviewerCountSettingPanel")).toBeHidden();
  await expect(page.locator("#defaultBranceSettingPanel")).toBeHidden();
  await expect(page.locator("#subMenuProjectChangeVCS")).toBeHidden();
  await expect(page.locator("#reviewerCountDisable")).toBeChecked();
  await expect(page.locator("#welReviewerCount")).toBeHidden();

  await page.locator("#menuSettingPullRequest").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();
  await expect(page.locator("#reviewerCountSettingPanel")).toBeVisible();

  await page.locator("#menuSettingPullRequest").uncheck();
  await expect(page.locator("#reviewerCountSettingPanel")).toBeHidden();
  await expect(page.locator("#reviewerCountDisable")).toBeChecked();

  await page.locator("#menuSettingReview").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();
});

test("project settings menu checkbox owners preserve legacy labels and geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectSettings(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/settingform`);

  const labels = page.locator(
    '[data-stylex-owner^="project-menu-checkbox-"][data-stylex-owner$="-label"]',
  );
  const inputs = page.locator(
    '[data-stylex-owner^="project-menu-checkbox-"][data-stylex-owner$="-input"]',
  );
  const ids = [
    "menuSettingCode",
    "menuSettingIssue",
    "menuSettingPullRequest",
    "menuSettingReview",
    "menuSettingMilestone",
    "menuSettingBoard",
  ];

  await expect(labels).toHaveCount(6);
  await expect(inputs).toHaveCount(6);
  await expect(labels).toHaveText([
    "Code",
    "Issue",
    "Pull request",
    "Review",
    "Milestone",
    "Board",
  ]);
  await expect(labels.evaluateAll((nodes) => nodes.map((node) => node.htmlFor))).resolves.toEqual(
    ids,
  );
  for (const id of ids) {
    await expect(page.locator(`#${id}`)).toBeChecked();
  }

  const readOwners = () =>
    labels.evaluateAll((nodes) =>
      nodes.map((label) => {
        const input = label.querySelector<HTMLInputElement>("input");
        const labelBox = label.getBoundingClientRect();
        const inputBox = input?.getBoundingClientRect();
        const parentBox = label.parentElement?.getBoundingClientRect();
        const labelStyle = getComputedStyle(label);
        const inputStyle = input ? getComputedStyle(input) : null;
        if (!input || !inputBox || !parentBox || !inputStyle) {
          throw new Error("Missing menu checkbox owner");
        }
        return {
          labelMarginLeft: labelStyle.marginLeft,
          labelVerticalAlign: labelStyle.verticalAlign,
          inputMargin: inputStyle.margin,
          inputVerticalAlign: inputStyle.verticalAlign,
          contained: inputBox.left >= labelBox.left && inputBox.right <= labelBox.right,
          withinDescription: labelBox.left >= parentBox.left && labelBox.right <= parentBox.right,
        };
      }),
    );

  await expect.poll(readOwners).toEqual([
    {
      labelMarginLeft: "0px",
      labelVerticalAlign: "middle",
      inputMargin: "2px",
      inputVerticalAlign: "top",
      contained: true,
      withinDescription: true,
    },
    ...Array.from({ length: 5 }, () => ({
      labelMarginLeft: "15px",
      labelVerticalAlign: "middle",
      inputMargin: "2px",
      inputVerticalAlign: "top",
      contained: true,
      withinDescription: true,
    })),
  ]);

  await page.locator("#menuSettingCode").uncheck();
  await expect(page.locator("#menuSettingCode")).not.toBeChecked();
  await expect(page.locator("#menuSettingPullRequest")).not.toBeChecked();
  await expect(page.locator("#menuSettingReview")).not.toBeChecked();
  await expect(page.locator("#defaultBranceSettingPanel")).toBeHidden();

  await page.locator("#menuSettingPullRequest").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  await expect(page.locator("#reviewerCountSettingPanel")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(readOwners).toEqual([
    {
      labelMarginLeft: "0px",
      labelVerticalAlign: "middle",
      inputMargin: "2px",
      inputVerticalAlign: "top",
      contained: true,
      withinDescription: true,
    },
    ...Array.from({ length: 5 }, () => ({
      labelMarginLeft: "15px",
      labelVerticalAlign: "middle",
      inputMargin: "2px",
      inputVerticalAlign: "top",
      contained: true,
      withinDescription: true,
    })),
  ]);
});

test("project settings save validates legacy project name rules before update", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[] =
    [];
  await mockProjectSettings(page, { updateRequests });

  await page.goto(`${basePath}/admin/sample/settingform`);

  await page.locator("#project-name").fill("sample!");
  const invalidNameDialog = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator("#save").click();
  await expect(invalidNameDialog).resolves.toBe(
    "Enter name in alphabetnumerical or symbol characters(_-.)",
  );
  expect(updateRequests).toEqual([]);

  await page.locator("#project-name").fill(".git");
  const reservedNameDialog = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator("#save").click();
  await expect(reservedNameDialog).resolves.toBe("You can't use reserved names.");
  expect(updateRequests).toEqual([]);
});

test("project settings logo input validates image files and auto-submits like legacy", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const uploadRequests: { hasCsrfToken: boolean; method: string }[] = [];
  const updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[] =
    [];
  await mockProjectSettings(page, { updateRequests, uploadRequests });

  await page.goto(`${basePath}/admin/sample/settingform`);
  await page.locator("#logoPath").evaluate((input) => {
    (input as HTMLInputElement & { __reactOwnedResetMarker?: string }).__reactOwnedResetMarker =
      "initial";
  });

  const dialogPromise = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator("#logoPath").setInputFiles({
    buffer: Buffer.from("not an image"),
    mimeType: "text/plain",
    name: "not-image.txt",
  });
  await expect(dialogPromise).resolves.toBe("This is not an image file.");
  await expect(page.locator("#logoPath")).toHaveValue("");
  await expect
    .poll(() =>
      page
        .locator("#logoPath")
        .evaluate(
          (input) =>
            (input as HTMLInputElement & { __reactOwnedResetMarker?: string })
              .__reactOwnedResetMarker ?? null,
        ),
    )
    .toBeNull();
  expect(uploadRequests).toEqual([]);
  expect(updateRequests).toEqual([]);
  await page.locator("#logoPath").evaluate((input) => {
    (input as HTMLInputElement & { __reactOwnedResetMarker?: string }).__reactOwnedResetMarker =
      "after-invalid-reset";
  });

  const updateResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/owners/admin/projects/sample") &&
      response.request().method() === "PATCH",
  );
  await page.locator("#logoPath").setInputFiles({
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    mimeType: "image/png",
    name: "project-logo.png",
  });
  await updateResponsePromise;

  expect(uploadRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  expect(updateRequests).toHaveLength(1);
  expect(updateRequests[0]).toMatchObject({
    body: {
      logoAttachmentId: 42,
      overview: "Sample overview",
      projectName: "sample",
      projectScope: "PUBLIC",
    },
    hasCsrfToken: true,
    method: "PATCH",
  });
  await expect(page.locator("#logoPath")).toHaveValue("");
  await expect
    .poll(() =>
      page
        .locator("#logoPath")
        .evaluate(
          (input) =>
            (input as HTMLInputElement & { __reactOwnedResetMarker?: string })
              .__reactOwnedResetMarker ?? null,
        ),
    )
    .toBeNull();
});

async function mockProjectSettings(
  page: Page,
  overrides: Partial<{
    container: Record<string, unknown>;
    favoriteResponseFavorited: boolean;
    favoriteRequests: { hasCsrfToken: boolean; method: string }[];
    branchRequests: string[];
    defaultBranchRequests: {
      body: Record<string, unknown>;
      hasCsrfToken: boolean;
      method: string;
    }[];
    ownerName: string;
    project: Record<string, unknown>;
    projectName: string;
    updateRequests: { body: Record<string, unknown>; hasCsrfToken: boolean; method: string }[];
    uploadRequests: { hasCsrfToken: boolean; method: string }[];
  }> = {},
) {
  const ownerName = overrides.ownerName ?? "admin";
  const projectName = overrides.projectName ?? "sample";
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
      headers: { "x-csrf-token": "csrf-settings" },
      body: JSON.stringify({
        session: {
          csrfToken: "csrf-settings",
          projection: {},
          userId: 1,
        },
        user: {
          emailAddress: "admin@example.com",
          id: 1,
          isConfirmed: true,
          isSiteAdmin: true,
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/settings`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...projectSettings(ownerName, projectName),
          ...overrides.project,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ...projectContainer(ownerName, projectName),
          ...overrides.project,
          ...overrides.container,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/favorite`,
    async (route) => {
      const request = route.request();
      overrides.favoriteRequests?.push({
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-settings",
        method: request.method(),
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ favorited: overrides.favoriteResponseFavorited ?? true }),
      });
    },
  );
  await page.route(`**/api/v1/owners/${ownerName}/projects/${projectName}`, async (route) => {
    const request = route.request();
    if (request.method() !== "PATCH") {
      await route.fallback();
      return;
    }
    overrides.updateRequests?.push({
      body: request.postDataJSON() as Record<string, unknown>,
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-settings",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...projectSettings(ownerName, projectName),
        ownerName,
        projectName,
        logoUrl: "/files/42",
      }),
    });
  });
  await page.route("**/files", async (route) => {
    const request = route.request();
    overrides.uploadRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-settings",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: 42,
        mimeType: "image/png",
        name: "project-logo.png",
        size: 4,
        url: "/files/42",
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/members`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          enrollmentRequests: [],
          members: [
            {
              avatarUrl: "/assets/images/default-avatar-32.png",
              isOwner: true,
              loginId: "admin",
              role: "manager",
              userId: 1,
              userLabel: "Site Admin",
            },
            {
              avatarUrl: "/assets/images/default-avatar-32.png",
              isOwner: false,
              loginId: "alice",
              role: "member",
              userId: 2,
              userLabel: "Alice Doe",
            },
          ],
          ownerName,
          projectName,
          roleOptions: [
            { label: "Manager", role: "manager" },
            { label: "Member", role: "member" },
          ],
          viewerCanUpdate: true,
        }),
      });
    },
  );
  await page.route(`**/api/v1/projects/${ownerName}/${projectName}/branches`, async (route) => {
    overrides.branchRequests?.push(route.request().method());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [
          { isDefault: true, name: "main", shortName: "main" },
          { isDefault: false, name: "develop", shortName: "develop" },
        ],
        defaultBranch: "main",
        noHead: false,
        ownerName,
        permissions: { canDelete: true, canUpdate: true },
        projectName,
      }),
    });
  });
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/branches/default`,
    async (route) => {
      const request = route.request();
      overrides.defaultBranchRequests?.push({
        body: request.postDataJSON() as Record<string, unknown>,
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-settings",
        method: request.method(),
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          branches: [
            { isDefault: false, name: "main", shortName: "main" },
            { isDefault: true, name: "develop", shortName: "develop" },
          ],
          defaultBranch: "develop",
          noHead: false,
          ownerName,
          permissions: { canDelete: true, canUpdate: true },
          projectName,
        }),
      });
    },
  );
}

function projectSettings(ownerName = "admin", projectName = "sample") {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    backgroundUrl: "/assets/images/bg-default-project.png",
    codeMemberOnly: false,
    defaultReviewerCount: 2,
    enrolledUsers: [],
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
    overview: "Sample overview",
    ownerName,
    projectId: 7,
    projectName,
    projectScope: "PUBLIC",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanUpdate: true,
    watchCount: 5,
  };
}

function projectContainer(ownerName = "admin", projectName = "sample") {
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
    ownerName,
    projectName,
    vcs: "GIT",
    viewerCanUpdate: true,
  };
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(
        ".unsupported, [data-stylex-owner=global-gnb-outer], .project-header-outer, .project-menu-outer, .page-wrap-outer, [data-stylex-owner=site-footer]",
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
      if (node.matches("#s2id_project-default-branch.select2-container")) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            !(
              node.matches("#project-default-branch.select2-offscreen") &&
              (attr.name === "class" || attr.name === "tabindex")
            ) &&
            (isProjectSettingsMenuAnchor(node) ||
              (attr.name !== "aria-current" && attr.name !== "data-status")),
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

    function isProjectSettingsMenuAnchor(node: Element) {
      return node.matches(".project-page-wrap > .nav.nav-tabs a");
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/, "").replaceAll('"', "'");
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }
  });
}

async function projectHeaderMetrics(page: Page) {
  return page.evaluate(() => {
    const header = requireElement(".project-header-outer");
    const inner = requireElement(".project-header-inner");
    const wrap = requireElement(".project-header-wrap");
    const avatar = requireElement(".project-header-avatar");
    const menu = requireElement(".project-menu-outer");
    const headerRect = header.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const avatarRect = avatar.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    return {
      avatarHeight: Math.round(avatarRect.height),
      avatarTopOffsetFromHeaderBottom: Math.round(avatarRect.top - headerRect.bottom),
      avatarWidth: Math.round(avatarRect.width),
      headerHeight: Math.round(headerRect.height),
      headerInnerHeight: Math.round(innerRect.height),
      menuHeight: Math.round(menuRect.height),
      menuTopOffsetFromHeaderBottom: Math.round(menuRect.top - headerRect.bottom),
      wrapHeight: Math.round(wrapRect.height),
      wrapWidthRatio: Number((wrapRect.width / headerRect.width).toFixed(2)),
    };

    function requireElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function projectSettingMetrics(page: Page) {
  return page.evaluate(() => {
    const form = requireElement<HTMLFormElement>("#saveSetting");
    const bubble = requireElement(".bubble-wrap.gray");
    const logo = requireElement(".setting-box.left .logo-wrap");
    const textarea = requireElement("#project-desc");
    const saveWrap = requireElement(".box-wrap.bottom");
    const bubbleStyle = getComputedStyle(bubble);
    const textareaRect = textarea.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const shareDescriptionRect = requireElement(
      ".box-wrap.middle .cu-desc",
    ).getBoundingClientRect();

    return {
      bubbleBackground: bubbleStyle.backgroundColor,
      bubbleBorderRadius: bubbleStyle.borderTopLeftRadius,
      defaultBranchName: requireElement<HTMLSelectElement>("#project-default-branch").name,
      formAction: form.getAttribute("action"),
      formEnctype: form.getAttribute("enctype"),
      formMethod: form.getAttribute("method"),
      hiddenId: form.querySelector<HTMLInputElement>('input[name="id"]')?.value,
      logoHeight: Math.round(logoRect.height),
      logoWidth: Math.round(logoRect.width),
      menuSettingName: requireElement<HTMLInputElement>("#menuSettingPullRequest").name,
      saveTextAlign: getComputedStyle(saveWrap).textAlign,
      shareDescriptionLeft: Math.round(shareDescriptionRect.left),
      shareDescriptionRight: Math.floor(shareDescriptionRect.right),
      shareDescriptionWidth: Math.round(shareDescriptionRect.width),
      textareaHeight: Math.round(textareaRect.height),
      watchingCount: form.querySelector<HTMLInputElement>('input[name="watchingCount"]')?.value,
    };

    function requireElement<T extends HTMLElement = HTMLElement>(selector: string) {
      const element = document.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function projectNamePopoverMetrics(page: Page) {
  return page.evaluate(() => {
    const rightColumn = requireElement(".setting-box.right");
    const input = requireElement<HTMLInputElement>("#project-name");
    const popover = requireElement(".setting-box.right .popover.left");
    const title = requireElement(".setting-box.right .popover-title");
    const content = requireElement(".setting-box.right .popover-content");
    const arrow = requireElement(".setting-box.right .popover .arrow");
    const rightColumnRect = rightColumn.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const arrowRect = arrow.getBoundingClientRect();
    const titleStyle = getComputedStyle(title);

    return {
      arrowCenteredVertically:
        Math.abs(
          arrowRect.top + arrowRect.height / 2 - (popoverRect.top + popoverRect.height / 2),
        ) <= 2,
      contentWidth: Math.round(contentRect.width),
      inputKeptInsideRightColumn:
        inputRect.left >= rightColumnRect.left && inputRect.right <= rightColumnRect.right,
      placement: popover.classList.contains("left") ? "left" : "",
      popoverLeftOfInput: popoverRect.right <= inputRect.left,
      popoverVisible: getComputedStyle(popover).display !== "none" && popoverRect.width > 0,
      titleHidden: titleStyle.display === "none",
    };

    function requireElement<T extends HTMLElement = HTMLElement>(selector: string) {
      const element = document.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function projectNonGitSettingMetrics(page: Page) {
  return page.evaluate(() => {
    const form = requireElement<HTMLFormElement>("#saveSetting");
    const pageWrap = requireElement(".page-wrap-outer");
    const projectWrap = requireElement(".project-page-wrap");
    const leftBox = requireElement(".setting-box.left");
    const rightBox = requireElement(".setting-box.right");
    const middleRows = Array.from(document.querySelectorAll<HTMLElement>(".box-wrap.middle"));
    const middleLabels = middleRows.map((row) =>
      row.querySelector<HTMLElement>(":scope > .cu-label")?.textContent?.trim(),
    );
    const menuCheckboxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(".box-wrap.middle:last-of-type input.radio-btn"),
    );
    const pageWrapRect = pageWrap.getBoundingClientRect();
    const projectWrapRect = projectWrap.getBoundingClientRect();
    const leftBoxRect = leftBox.getBoundingClientRect();
    const rightBoxRect = rightBox.getBoundingClientRect();

    return {
      formAction: form.getAttribute("action"),
      hasDefaultBranchPayload: form.querySelector('[name="defaultBranch"]') !== null,
      hasDefaultReviewerCountPayload: form.querySelector('[name="defaultReviewerCount"]') !== null,
      hasPullRequestPayload: form.querySelector('[name="pullRequest"]') !== null,
      hasReviewerCountPayload: form.querySelector('[name="isUsingReviewerCount"]') !== null,
      menuCheckboxOrder: menuCheckboxes.map((input) => input.name),
      middleLabels,
      shellContained:
        projectWrapRect.left >= pageWrapRect.left &&
        projectWrapRect.right <= pageWrapRect.right &&
        projectWrapRect.top >= pageWrapRect.top,
      topColumnsDoNotOverlap: leftBoxRect.right <= rightBoxRect.left,
    };

    function requireElement<T extends HTMLElement = HTMLElement>(selector: string) {
      const element = document.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function navbarSearchContainmentMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = requireElement("[data-stylex-owner=global-gnb-outer]");
    const form = requireElement('form[name="gnb-search-form"]');
    const scope = requireElement("#gnb-search-scope-title");
    const searchBox = requireElement('[data-stylex-owner="global-gnb-search-box"]');
    const input = requireElement('[data-stylex-owner="global-gnb-search-input"]');
    const navbarRect = navbar.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    const scopeRect = scope.getBoundingClientRect();
    const searchBoxRect = searchBox.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();

    return {
      inputInsideNavbar:
        inputRect.top >= navbarRect.top &&
        inputRect.bottom <= navbarRect.bottom &&
        inputRect.right <= navbarRect.right,
      scopeInsideNavbar:
        scopeRect.top >= navbarRect.top &&
        scopeRect.bottom <= navbarRect.bottom &&
        scopeRect.left >= navbarRect.left,
      searchBoxInsideForm:
        searchBoxRect.top >= formRect.top &&
        searchBoxRect.bottom <= formRect.bottom &&
        searchBoxRect.right <= formRect.right,
    };

    function requireElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup;
    return Array.from(template.content.childNodes)
      .map((node) => visit(node))
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
            (isProjectSettingsMenuAnchor(node) ||
              (attr.name !== "aria-current" && attr.name !== "data-status")),
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

    function isProjectSettingsMenuAnchor(node: Element) {
      return node.matches(".project-page-wrap > .nav.nav-tabs a");
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/, "").replaceAll('"', "'");
      }
      return attr.value.replace(/\s+/g, " ").trim();
    }
  }, html);
}
